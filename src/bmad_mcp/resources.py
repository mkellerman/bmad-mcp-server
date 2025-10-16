"""Resource loader for embedded BMAD files.

Prefers files from the installed package's embedded directory. Falls back to
importlib.resources to support environments where files are packaged inside the
wheel and direct filesystem paths are not available.
"""

import os
from pathlib import Path
from typing import Optional
import importlib.resources as ilr


def get_embedded_path() -> Path:
    """Get the path to the embedded BMAD files."""
    return Path(__file__).parent / "embedded"


def load_embedded_file(relative_path: str) -> str:
    """
    Load an embedded BMAD file by its relative path.

    Args:
        relative_path: Path relative to the embedded directory
                      (e.g., "core/agents/bmad-master.md")

    Returns:
        Content of the file as string

    Raises:
        FileNotFoundError: If the file doesn't exist
    """
    full_path = get_embedded_path() / relative_path

    # Primary: filesystem path (editable installs / local dev)
    if full_path.exists():
        return full_path.read_text(encoding="utf-8")

    # Fallback: package resource access for installed wheels
    try:
        root = ilr.files(__package__).joinpath("embedded")
        resource = root.joinpath(relative_path)
        return resource.read_text(encoding="utf-8")
    except Exception as e:
        raise FileNotFoundError(f"Embedded file not found: {relative_path}") from e


def load_config() -> dict:
    """
    Load the BMAD configuration file.

    Returns:
        Dictionary with config values
    """
    import yaml

    config_content = load_embedded_file("core/config.yaml")
    return yaml.safe_load(config_content)


def list_embedded_files(pattern: str = "*") -> list[str]:
    """
    List all embedded files matching a pattern.

    Args:
        pattern: Glob pattern (e.g., "**/*.yaml")

    Returns:
        List of relative paths
    """
    embedded_root = get_embedded_path()
    if embedded_root.exists():
        files = embedded_root.glob(pattern)
        return [str(f.relative_to(embedded_root)) for f in files if f.is_file()]

    # Fallback best-effort listing via importlib.resources (limited globbing)
    # Only supports recursive '**/*' listing; filter manually by simple suffixes.
    try:
        root = ilr.files(__package__).joinpath("embedded")
        # importlib.resources Traversable supports rglob in Python 3.11+; for 3.10, emulate
        try:
            # Prefer rglob if available
            iter_paths = list(root.rglob("*"))  # type: ignore[attr-defined]
        except Exception:
            # Shallow iteration as a fallback
            iter_paths = list(root.iterdir())

        results: list[str] = []
        for p in iter_paths:
            try:
                if p.is_file():
                    # Relative to embedded root
                    rel = str(p.relative_to(root))
                    # Simple pattern check: include all; caller can filter
                    results.append(rel)
            except Exception:
                continue
        return results
    except Exception:
        return []
