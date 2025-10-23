"""
File Reader - Secure file reading with path validation.

This module provides secure file reading capabilities with path traversal
protection. It ensures that only files within the BMAD directory tree
can be accessed.
"""

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class FileReadError(Exception):
    """Exception raised when file reading fails."""
    pass


class PathTraversalError(FileReadError):
    """Exception raised when path traversal is attempted."""
    pass


class FileReader:
    """
    Secure file reader with path validation.
    
    Ensures all file reads are within the allowed BMAD directory tree.
    Prevents path traversal attacks and unauthorized file access.
    """
    
    def __init__(self, bmad_root: Path):
        """
        Initialize file reader.
        
        Args:
            bmad_root: Path to BMAD installation directory (the security boundary)
        """
        self.bmad_root = Path(bmad_root).resolve()
        
        # Validate BMAD root exists
        if not self.bmad_root.exists():
            logger.warning(f"BMAD root directory not found: {self.bmad_root}")
    
    def read_file(self, file_path: str) -> str:
        """
        Read file contents with security validation.
        
        Args:
            file_path: Relative or absolute path to file
            
        Returns:
            File contents as string
            
        Raises:
            PathTraversalError: If file path is outside BMAD root
            FileReadError: If file doesn't exist or can't be read
        """
        # Resolve the path (handles relative paths, symlinks, .., etc.)
        resolved_path = self._resolve_path(file_path)
        
        # Validate path is within BMAD root
        self._validate_path(resolved_path)
        
        # Read file
        try:
            with open(resolved_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            logger.info(f"Read {len(content)} bytes from {resolved_path}")
            return content
            
        except FileNotFoundError:
            error_msg = f"File not found: {file_path}"
            logger.error(error_msg)
            raise FileReadError(error_msg)
        except PermissionError:
            error_msg = f"Permission denied reading file: {file_path}"
            logger.error(error_msg)
            raise FileReadError(error_msg)
        except Exception as e:
            error_msg = f"Error reading file {file_path}: {e}"
            logger.error(error_msg, exc_info=True)
            raise FileReadError(error_msg)
    
    def file_exists(self, file_path: str) -> bool:
        """
        Check if file exists within BMAD root.
        
        Args:
            file_path: Relative or absolute path to file
            
        Returns:
            True if file exists and is within BMAD root, False otherwise
        """
        try:
            resolved_path = self._resolve_path(file_path)
            self._validate_path(resolved_path)
            return resolved_path.exists() and resolved_path.is_file()
        except (PathTraversalError, FileReadError):
            return False
    
    def _resolve_path(self, file_path: str) -> Path:
        """
        Resolve file path to absolute path.
        
        Handles relative paths by treating them as relative to BMAD root.
        
        Args:
            file_path: Path to resolve
            
        Returns:
            Resolved absolute Path object
        """
        path = Path(file_path)
        
        # If path is relative, make it relative to BMAD root
        if not path.is_absolute():
            path = self.bmad_root / path
        
        # Resolve symlinks and normalize (remove .. and .)
        return path.resolve()
    
    def _validate_path(self, resolved_path: Path) -> None:
        """
        Validate that resolved path is within BMAD root.
        
        Args:
            resolved_path: Absolute resolved path to validate
            
        Raises:
            PathTraversalError: If path is outside BMAD root
        """
        # Check if resolved path is within BMAD root
        try:
            # relative_to will raise ValueError if path is not relative to bmad_root
            resolved_path.relative_to(self.bmad_root)
        except ValueError:
            error_msg = (
                f"Path traversal attempt detected: {resolved_path} "
                f"is outside BMAD root {self.bmad_root}"
            )
            logger.warning(error_msg)
            raise PathTraversalError(error_msg)
