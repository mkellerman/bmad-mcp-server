"""
BMAD MCP Server Test Harness

Multi-phase E2E test that validates:
- MCP protocol compliance (prompts, resources, tools)
- Schema validation for inputs/outputs
- Agent/workflow discovery and serving
- File serving with security validation
"""

import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional
from jsonschema import validate, ValidationError

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.loaders.manifest_loader import ManifestLoader
from src.utils.file_reader import FileReader
from src.mcp_server import BMADMCPServer

# -----------------------------
# Config
# -----------------------------
PROJECT_ROOT = Path(__file__).parent.parent.parent
BMAD_ROOT = PROJECT_ROOT / "bmad"

# MCP Protocol Schemas
PROMPT_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "description": {"type": "string"},
        "arguments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "required": {"type": "boolean"}
                },
                "required": ["name", "description", "required"]
            }
        }
    },
    "required": ["name", "description"]
}

RESOURCE_SCHEMA = {
    "type": "object",
    "properties": {
        "uri": {"type": "string"},
        "name": {"type": "string"},
        "description": {"type": "string"},
        "mimeType": {"type": "string"}
    },
    "required": ["uri", "name"]
}

# -----------------------------
# Test Phases
# -----------------------------

class TestTrace:
    """Collect test execution trace for debugging and golden tests."""
    
    def __init__(self):
        self.phases = {}
        self.assertions = []
        
    def record_phase(self, phase_name: str, data: Any):
        """Record phase execution data."""
        self.phases[phase_name] = data
        
    def record_assertion(self, name: str, passed: bool, message: str = ""):
        """Record assertion result."""
        self.assertions.append({
            "name": name,
            "passed": passed,
            "message": message
        })
        
    def save(self, filename: str = "trace.bmad.mcp.json"):
        """Save trace to file."""
        output = {
            "phases": self.phases,
            "assertions": self.assertions,
            "summary": {
                "total": len(self.assertions),
                "passed": sum(1 for a in self.assertions if a["passed"]),
                "failed": sum(1 for a in self.assertions if not a["passed"])
            }
        }
        with open(filename, "w") as f:
            json.dump(output, f, indent=2)
        return output


async def phase_a_manifest_discovery(trace: TestTrace):
    """
    Phase A: Manifest Discovery
    - Load agent/workflow manifests
    - Validate manifest structure
    - Verify expected agents exist
    """
    print("\n" + "=" * 60)
    print("Phase A: Manifest Discovery")
    print("=" * 60)
    
    loader = ManifestLoader(BMAD_ROOT)
    
    # Load manifests
    agents = loader.load_agent_manifest()
    workflows = loader.load_workflow_manifest()
    tasks = loader.load_task_manifest()
    
    trace.record_phase("A_manifest_discovery", {
        "agents_count": len(agents),
        "workflows_count": len(workflows),
        "tasks_count": len(tasks),
        "sample_agents": agents[:3] if agents else [],
        "sample_workflows": workflows[:3] if workflows else []
    })
    
    # Assertions
    trace.record_assertion(
        "agents_loaded",
        len(agents) > 0,
        f"Expected agents, got {len(agents)}"
    )
    
    trace.record_assertion(
        "workflows_loaded",
        len(workflows) > 0,
        f"Expected workflows, got {len(workflows)}"
    )
    
    # Verify specific agents exist
    expected_agents = ["bmad-master", "analyst", "architect", "dev"]
    for agent_name in expected_agents:
        agent = loader.get_agent_by_name(agent_name)
        trace.record_assertion(
            f"agent_{agent_name}_exists",
            agent is not None,
            f"Agent '{agent_name}' should exist"
        )
        if agent:
            print(f"  ✓ Found agent: {agent['name']} - {agent.get('displayName', 'N/A')}")
    
    # Verify manifest structure
    if agents:
        agent = agents[0]
        required_fields = ["name", "displayName", "module", "path"]
        for field in required_fields:
            trace.record_assertion(
                f"agent_has_field_{field}",
                field in agent,
                f"Agent manifest should have '{field}' field"
            )
    
    return agents, workflows, tasks


async def phase_b_file_reading(trace: TestTrace, agents: List[Dict]):
    """
    Phase B: Secure File Reading
    - Read agent files from manifest paths
    - Validate security (path traversal prevention)
    - Verify file content structure
    """
    print("\n" + "=" * 60)
    print("Phase B: Secure File Reading")
    print("=" * 60)
    
    reader = FileReader(BMAD_ROOT)
    
    files_read = []
    
    # Test reading a few agent files
    for agent in agents[:3]:
        agent_path = agent.get("path", "")
        if not agent_path:
            continue
            
        # Paths in manifest have "bmad/" prefix, remove it
        if agent_path.startswith("bmad/"):
            rel_path = agent_path.replace("bmad/", "", 1)
        elif agent_path.startswith("/"):
            # Extract relative path from absolute
            rel_path = agent_path.replace(str(BMAD_ROOT), "").lstrip("/")
        else:
            rel_path = agent_path
        
        try:
            content = reader.read_file(rel_path)
            files_read.append({
                "agent": agent["name"],
                "path": rel_path,
                "size": len(content),
                "first_100_chars": content[:100]
            })
            
            trace.record_assertion(
                f"read_agent_{agent['name']}",
                len(content) > 0,
                f"Agent file should have content"
            )
            
            print(f"  ✓ Read {agent['name']}: {len(content)} bytes")
            
        except Exception as e:
            trace.record_assertion(
                f"read_agent_{agent['name']}",
                False,
                f"Failed to read: {str(e)}"
            )
            print(f"  ✗ Failed to read {agent['name']}: {e}")
    
    # Test security: try to read outside BMAD root
    try:
        reader.read_file("../../etc/passwd")
        trace.record_assertion(
            "security_path_traversal_blocked",
            False,
            "Should have blocked path traversal"
        )
    except Exception as e:
        trace.record_assertion(
            "security_path_traversal_blocked",
            "traversal" in str(e).lower() or "outside" in str(e).lower(),
            "Correctly blocked path traversal"
        )
        print(f"  ✓ Security: Path traversal blocked")
    
    trace.record_phase("B_file_reading", {
        "files_read": files_read,
        "total_files": len(files_read)
    })
    
    return files_read


async def phase_c_mcp_server_init(trace: TestTrace):
    """
    Phase C: MCP Server Initialization
    - Initialize BMADMCPServer
    - Verify server configuration
    - Check BMAD root validation
    """
    print("\n" + "=" * 60)
    print("Phase C: MCP Server Initialization")
    print("=" * 60)
    
    try:
        server = BMADMCPServer(BMAD_ROOT)
        
        trace.record_assertion(
            "server_initialized",
            True,
            "Server initialized successfully"
        )
        print(f"  ✓ Server initialized with BMAD root: {BMAD_ROOT}")
        
        trace.record_assertion(
            "bmad_root_validated",
            server.bmad_root == BMAD_ROOT.resolve(),
            "BMAD root path validated"
        )
        
        trace.record_phase("C_server_init", {
            "bmad_root": str(server.bmad_root),
            "initialized": True
        })
        
        return server
        
    except Exception as e:
        trace.record_assertion(
            "server_initialized",
            False,
            f"Failed to initialize: {str(e)}"
        )
        print(f"  ✗ Server initialization failed: {e}")
        raise


async def phase_d_prompt_listing(trace: TestTrace, server: BMADMCPServer):
    """
    Phase D: Prompt Listing (MCP Protocol)
    - Call list_prompts()
    - Validate prompt schema
    - Verify expected prompts exist
    """
    print("\n" + "=" * 60)
    print("Phase D: MCP Prompt Listing")
    print("=" * 60)
    
    prompts = await server.list_prompts()
    
    trace.record_phase("D_prompt_listing", {
        "prompts_count": len(prompts),
        "prompts": [
            {"name": p.name, "description": p.description[:100] if p.description else ""}
            for p in prompts[:5]
        ]
    })
    
    trace.record_assertion(
        "prompts_returned",
        isinstance(prompts, list),
        "list_prompts should return a list"
    )
    
    # Note: Current implementation returns empty list (Story 1.4 pending)
    # We validate the structure even if empty
    for prompt in prompts:
        prompt_dict = {
            "name": prompt.name,
            "description": prompt.description,
            "arguments": [
                {
                    "name": arg.name,
                    "description": arg.description,
                    "required": arg.required
                }
                for arg in (prompt.arguments or [])
            ]
        }
        
        try:
            validate(prompt_dict, PROMPT_SCHEMA)
            trace.record_assertion(
                f"prompt_schema_valid_{prompt.name}",
                True,
                "Prompt matches MCP schema"
            )
            print(f"  ✓ Valid prompt: {prompt.name}")
        except ValidationError as e:
            trace.record_assertion(
                f"prompt_schema_valid_{prompt.name}",
                False,
                f"Schema validation failed: {e.message}"
            )
            print(f"  ✗ Invalid prompt schema: {e.message}")
    
    if not prompts:
        print("  ℹ No prompts returned (Story 1.4 pending)")
    
    return prompts


async def phase_e_resource_listing(trace: TestTrace, server: BMADMCPServer):
    """
    Phase E: Resource Listing (MCP Protocol)
    - Call list_resources()
    - Validate resource schema
    - Verify expected resources exist
    """
    print("\n" + "=" * 60)
    print("Phase E: MCP Resource Listing")
    print("=" * 60)
    
    resources = await server.list_resources()
    
    trace.record_phase("E_resource_listing", {
        "resources_count": len(resources),
        "resources": [
            {"uri": r.uri, "name": r.name}
            for r in resources[:5]
        ]
    })
    
    trace.record_assertion(
        "resources_returned",
        isinstance(resources, list),
        "list_resources should return a list"
    )
    
    for resource in resources:
        resource_dict = {
            "uri": resource.uri,
            "name": resource.name,
            "description": resource.description or "",
            "mimeType": resource.mimeType or "text/plain"
        }
        
        try:
            validate(resource_dict, RESOURCE_SCHEMA)
            trace.record_assertion(
                f"resource_schema_valid_{resource.name}",
                True,
                "Resource matches MCP schema"
            )
            print(f"  ✓ Valid resource: {resource.name}")
        except ValidationError as e:
            trace.record_assertion(
                f"resource_schema_valid_{resource.name}",
                False,
                f"Schema validation failed: {e.message}"
            )
            print(f"  ✗ Invalid resource schema: {e.message}")
    
    if not resources:
        print("  ℹ No resources returned (Story 1.4 pending)")
    
    return resources


async def phase_f_integration_test(trace: TestTrace):
    """
    Phase F: MCP Server Integration via subprocess
    - Start server as subprocess
    - Verify stdio communication
    - Check server logs
    """
    print("\n" + "=" * 60)
    print("Phase F: MCP Server Integration Test")
    print("=" * 60)
    
    # Test that server can start
    try:
        process = subprocess.Popen(
            ["uv", "run", "bmad-mcp-server"],
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Give it 2 seconds to start
        await asyncio.sleep(2)
        
        # Check if still running
        poll = process.poll()
        
        if poll is None:
            # Still running - good!
            trace.record_assertion(
                "server_starts_successfully",
                True,
                "Server started and is running"
            )
            print("  ✓ Server started successfully")
            
            # Kill it
            process.terminate()
            await asyncio.sleep(1)
            process.kill()
        else:
            stderr = process.stderr.read() if process.stderr else ""
            trace.record_assertion(
                "server_starts_successfully",
                False,
                f"Server exited with code {poll}: {stderr}"
            )
            print(f"  ✗ Server exited unexpectedly: {stderr}")
        
        trace.record_phase("F_integration_test", {
            "server_started": poll is None,
            "exit_code": poll
        })
        
    except Exception as e:
        trace.record_assertion(
            "server_starts_successfully",
            False,
            f"Failed to start server: {str(e)}"
        )
        print(f"  ✗ Failed to start server: {e}")


def print_summary(trace: TestTrace):
    """Print test summary."""
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    total = len(trace.assertions)
    passed = sum(1 for a in trace.assertions if a["passed"])
    failed = total - passed
    
    print(f"\nTotal assertions: {total}")
    print(f"Passed: {passed} ✓")
    print(f"Failed: {failed} ✗")
    
    if failed > 0:
        print("\nFailed assertions:")
        for assertion in trace.assertions:
            if not assertion["passed"]:
                print(f"  ✗ {assertion['name']}: {assertion['message']}")
    
    return failed == 0


async def main():
    """Run all test phases."""
    print("BMAD MCP Server Test Harness")
    print("=" * 60)
    print(f"BMAD Root: {BMAD_ROOT}")
    
    trace = TestTrace()
    
    try:
        # Phase A: Manifest Discovery
        agents, workflows, tasks = await phase_a_manifest_discovery(trace)
        
        # Phase B: File Reading
        files_read = await phase_b_file_reading(trace, agents)
        
        # Phase C: Server Init
        server = await phase_c_mcp_server_init(trace)
        
        # Phase D: Prompt Listing
        prompts = await phase_d_prompt_listing(trace, server)
        
        # Phase E: Resource Listing
        resources = await phase_e_resource_listing(trace, server)
        
        # Phase F: Integration Test
        await phase_f_integration_test(trace)
        
        # Save trace
        output = trace.save("trace.bmad.mcp.json")
        
        # Print summary
        all_passed = print_summary(trace)
        
        print("\n✅ Test harness completed.")
        print(f"Trace saved to: trace.bmad.mcp.json")
        print(f"Summary: {output['summary']}")
        
        return 0 if all_passed else 1
        
    except Exception as e:
        print(f"\n❌ Test harness failed: {e}")
        import traceback
        traceback.print_exc()
        trace.save("trace.bmad.mcp.error.json")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
