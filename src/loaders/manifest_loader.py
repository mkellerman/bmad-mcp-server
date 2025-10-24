"""
Manifest Loader - CSV manifest file parser for BMAD discovery.

This module reads CSV manifest files to discover available agents, workflows,
and tasks. It does NOT parse the actual agent/workflow files - just reads
the manifests for discovery purposes.
"""

import csv
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class ManifestLoader:
    """
    Loads and parses BMAD CSV manifest files for resource discovery.
    
    Reads manifest files to discover what agents, workflows, and tasks
    are available. Does not parse or process the actual resource files -
    that's the LLM's responsibility.
    """
    
    def __init__(self, bmad_root: Path):
        """
        Initialize manifest loader.
        
        Args:
            bmad_root: Path to project root (manifest paths include 'bmad/' prefix)
        """
        self.bmad_root = Path(bmad_root).resolve()
        self.manifest_dir = self.bmad_root / "bmad" / "_cfg"
        
        # Validate manifest directory exists
        if not self.manifest_dir.exists():
            raise ValueError(f"BMAD manifest directory not found: {self.manifest_dir}")
    
    def load_agent_manifest(self) -> list[dict]:
        """
        Load agent-manifest.csv and return list of agent metadata.
        
        Returns:
            List of dictionaries containing agent metadata:
            - name: Agent identifier (e.g., "analyst")
            - displayName: Human-readable name (e.g., "Mary")
            - title: Role/title description
            - icon: Emoji icon
            - role: Professional role
            - identity: Background description
            - communicationStyle: How the agent communicates
            - principles: Core operating principles
            - module: Module name (core/bmm)
            - path: Path to agent markdown file
            
        Returns empty list if manifest not found or on error.
        """
        return self._load_manifest("agent-manifest.csv")
    
    def load_workflow_manifest(self) -> list[dict]:
        """
        Load workflow-manifest.csv and return list of workflow metadata.
        
        Returns:
            List of dictionaries containing workflow metadata:
            - name: Workflow identifier
            - description: Workflow description
            - module: Module name (core/bmm)
            - path: Path to workflow.yaml file
            
        Returns empty list if manifest not found or on error.
        """
        return self._load_manifest("workflow-manifest.csv")
    
    def load_task_manifest(self) -> list[dict]:
        """
        Load task-manifest.csv and return list of task metadata.
        
        Returns:
            List of dictionaries containing task metadata.
            Format depends on task manifest structure.
            
        Returns empty list if manifest not found or on error.
        """
        return self._load_manifest("task-manifest.csv")
    
    def _load_manifest(self, filename: str) -> list[dict]:
        """
        Internal method to load any CSV manifest file.
        
        Args:
            filename: Name of manifest file (e.g., "agent-manifest.csv")
            
        Returns:
            List of dictionaries with CSV data, or empty list on error
        """
        manifest_path = self.manifest_dir / filename
        
        # Check if file exists
        if not manifest_path.exists():
            logger.warning(f"Manifest not found: {manifest_path}")
            return []
        
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                # Use DictReader to parse CSV into dictionaries
                reader = csv.DictReader(f)
                
                # Convert to list and filter out completely empty rows
                manifests = [
                    row for row in reader 
                    if any(value.strip() for value in row.values())
                ]
                
                logger.info(f"Loaded {len(manifests)} entries from {filename}")
                return manifests
                
        except csv.Error as e:
            logger.error(f"CSV parsing error in {manifest_path}: {e}")
            return []
        except Exception as e:
            logger.error(f"Error loading manifest {manifest_path}: {e}", exc_info=True)
            return []
    
    def get_agent_by_name(self, agent_name: str) -> Optional[dict]:
        """
        Get agent metadata by name.
        
        Args:
            agent_name: Agent identifier (e.g., "analyst")
            
        Returns:
            Agent metadata dict or None if not found
        """
        agents = self.load_agent_manifest()
        return next((a for a in agents if a.get('name') == agent_name), None)
    
    def get_workflow_by_name(self, workflow_name: str) -> Optional[dict]:
        """
        Get workflow metadata by name.
        
        Args:
            workflow_name: Workflow identifier
            
        Returns:
            Workflow metadata dict or None if not found
        """
        workflows = self.load_workflow_manifest()
        return next((w for w in workflows if w.get('name') == workflow_name), None)
    
    def get_task_by_name(self, task_name: str) -> Optional[dict]:
        """
        Get task metadata by name.
        
        Args:
            task_name: Task identifier
            
        Returns:
            Task metadata dict or None if not found
        """
        tasks = self.load_task_manifest()
        return next((t for t in tasks if t.get('name') == task_name), None)
