"""
Integration tests for workflow execution.

Tests complete workflow loading and execution scenarios.
"""

import pytest
from pathlib import Path
import yaml

from src.mcp_server import BMADMCPServer
from src.unified_tool import UnifiedBMADTool


@pytest.mark.integration
class TestWorkflowExecution:
    """Test workflow loading and execution."""
    
    @pytest.fixture
    def project_root(self):
        """Get project root directory."""
        return Path(__file__).parent.parent.parent
    
    @pytest.fixture
    def bmad_root(self, project_root):
        """Get BMAD root directory."""
        return project_root / "bmad"
    
    @pytest.fixture
    def mcp_server(self, project_root):
        """Create MCP server instance."""
        return BMADMCPServer(project_root)
    
    @pytest.fixture
    def unified_tool(self, project_root):
        """Create unified tool instance."""
        return UnifiedBMADTool(project_root)
    
    @pytest.mark.asyncio
    async def test_workflow_status_execution(self, unified_tool):
        """Test executing workflow-status workflow."""
        result = await unified_tool.execute("*workflow-status")
        
        assert result.get('success') == True
        assert result.get('type') == 'workflow'
        assert result.get('name') == 'workflow-status'
        
        content = result.get('content', '')
        assert len(content) > 100
        
        print(f"\n✓ workflow-status executed")
        print(f"  Content length: {len(content)} chars")
    
    @pytest.mark.asyncio
    async def test_all_workflows_loadable(self, unified_tool, bmad_root):
        """Test that all workflows in manifest can be loaded."""
        workflow_manifest_path = bmad_root / "_cfg" / "workflow-manifest.csv"
        
        if not workflow_manifest_path.exists():
            pytest.skip("Workflow manifest not found")
        
        workflows = unified_tool.workflows
        assert len(workflows) > 0, "No workflows found in manifest"
        
        print(f"\n✓ Found {len(workflows)} workflows in manifest")
        
        # Test loading each workflow
        success_count = 0
        failed_workflows = []
        
        for workflow in workflows[:5]:  # Test first 5 to keep test fast
            workflow_name = workflow.get('name')
            if not workflow_name:
                continue
            
            try:
                result = await unified_tool.execute(f"*{workflow_name}")
                if result.get('success'):
                    success_count += 1
                    print(f"  ✓ {workflow_name}")
                else:
                    failed_workflows.append(workflow_name)
                    print(f"  ✗ {workflow_name}: {result.get('error_message', 'Unknown error')}")
            except Exception as e:
                failed_workflows.append(workflow_name)
                print(f"  ✗ {workflow_name}: {str(e)}")
        
        print(f"\n✓ Successfully loaded {success_count} workflows")
        if failed_workflows:
            print(f"  Failed workflows: {', '.join(failed_workflows)}")
    
    @pytest.mark.asyncio
    async def test_workflow_via_mcp_server(self, mcp_server):
        """Test executing workflow via MCP server call_tool."""
        result = await mcp_server.call_tool("bmad", {"command": "*workflow-status"})
        
        assert len(result.content) > 0
        content = result.content[0].text
        
        assert len(content) > 100
        print(f"\n✓ Workflow executed via MCP server")
        print(f"  Content: {content[:200]}...")
    
    @pytest.mark.asyncio
    async def test_workflow_file_resolution(self, unified_tool, bmad_root):
        """Test that workflow files are correctly resolved."""
        workflows = unified_tool.workflows
        
        for workflow in workflows[:3]:  # Test first 3
            workflow_path = workflow.get('path')
            if not workflow_path:
                continue
            
            # Resolve path (might need project root prefix)
            full_path = bmad_root.parent / workflow_path
            
            # Check if file exists
            exists = full_path.exists()
            print(f"  {workflow.get('name')}: {workflow_path}")
            print(f"    Full path: {full_path}")
            print(f"    Exists: {exists}")
    
    @pytest.mark.asyncio
    async def test_workflow_yaml_validity(self, bmad_root):
        """Test that workflow YAML files are valid."""
        workflow_dirs = [
            bmad_root / "bmm" / "workflows",
            bmad_root / "core" / "workflows",
        ]
        
        yaml_files = []
        for workflow_dir in workflow_dirs:
            if workflow_dir.exists():
                yaml_files.extend(workflow_dir.rglob("*.yaml"))
        
        print(f"\n✓ Found {len(yaml_files)} YAML files")
        
        valid_count = 0
        for yaml_file in yaml_files[:10]:  # Test first 10
            try:
                with open(yaml_file, 'r') as f:
                    data = yaml.safe_load(f)
                    if data:  # Not empty
                        valid_count += 1
                        print(f"  ✓ {yaml_file.name}")
            except Exception as e:
                print(f"  ✗ {yaml_file.name}: {str(e)}")
        
        assert valid_count > 0, "No valid YAML files found"


@pytest.mark.integration
class TestWorkflowDiscovery:
    """Test workflow discovery mechanisms."""
    
    @pytest.fixture
    def unified_tool(self):
        """Create unified tool instance."""
        return UnifiedBMADTool(Path(__file__).parent.parent.parent)
    
    @pytest.mark.asyncio
    async def test_list_workflows_command(self, unified_tool):
        """Test *list-workflows discovery command."""
        result = await unified_tool.execute("*list-workflows")
        
        assert result.get('success') == True
        content = result.get('content', '')
        
        # Should list available workflows
        assert len(content) > 0
        print(f"\n✓ *list-workflows executed")
        print(f"  Content preview: {content[:300]}...")
    
    @pytest.mark.asyncio
    async def test_list_agents_command(self, unified_tool):
        """Test *list-agents discovery command."""
        result = await unified_tool.execute("*list-agents")
        
        assert result.get('success') == True
        content = result.get('content', '')
        
        # Should list available agents
        assert len(content) > 0
        assert 'analyst' in content.lower() or 'agent' in content.lower()
        print(f"\n✓ *list-agents executed")
        print(f"  Content preview: {content[:300]}...")
    
    @pytest.mark.asyncio
    async def test_help_command(self, unified_tool):
        """Test *help discovery command."""
        result = await unified_tool.execute("*help")
        
        assert result.get('success') == True
        content = result.get('content', '')
        
        # Should provide help information
        assert len(content) > 0
        print(f"\n✓ *help executed")
        print(f"  Content preview: {content[:300]}...")


@pytest.mark.integration
class TestWorkflowChaining:
    """Test chaining workflows together."""
    
    @pytest.fixture
    def unified_tool(self):
        """Create unified tool instance."""
        return UnifiedBMADTool(Path(__file__).parent.parent.parent)
    
    @pytest.mark.asyncio
    async def test_sequential_workflow_execution(self, unified_tool):
        """Test executing multiple workflows sequentially."""
        # Load analyst agent
        result1 = await unified_tool.execute("analyst")
        assert result1.get('success') == True
        
        # Execute workflow-status
        result2 = await unified_tool.execute("*workflow-status")
        assert result2.get('success') == True
        
        # Switch to PM agent
        result3 = await unified_tool.execute("pm")
        assert result3.get('success') == True
        
        print(f"\n✓ Sequential execution successful")
        print(f"  1. Analyst loaded: {len(result1.get('content', ''))} chars")
        print(f"  2. Workflow executed: {len(result2.get('content', ''))} chars")
        print(f"  3. PM loaded: {len(result3.get('content', ''))} chars")
    
    @pytest.mark.asyncio
    async def test_workflow_after_agent_load(self, unified_tool):
        """Test executing workflow immediately after loading agent."""
        # Load analyst
        agent_result = await unified_tool.execute("analyst")
        assert agent_result.get('success') == True
        
        # Immediately execute workflow
        workflow_result = await unified_tool.execute("*workflow-status")
        assert workflow_result.get('success') == True
        
        # Both should succeed independently
        assert len(agent_result.get('content', '')) > 500
        assert len(workflow_result.get('content', '')) > 100
        
        print(f"\n✓ Workflow after agent load successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
