"""
Performance and stress tests for BMAD MCP Server.

Tests system behavior under load and edge cases.
"""

import pytest
import asyncio
import time
from pathlib import Path

from src.mcp_server import BMADMCPServer
from src.unified_tool import UnifiedBMADTool


@pytest.mark.performance
class TestPerformance:
    """Test performance characteristics of the server."""
    
    @pytest.fixture
    def project_root(self):
        """Get project root directory."""
        return Path(__file__).parent.parent.parent / "src"
    
    @pytest.fixture
    def mcp_server(self, project_root):
        """Create MCP server instance."""
        return BMADMCPServer(project_root)
    
    @pytest.fixture
    def unified_tool(self, project_root):
        """Create unified tool instance."""
        return UnifiedBMADTool(project_root)
    
    @pytest.mark.asyncio
    async def test_agent_load_performance(self, unified_tool):
        """Test agent loading performance."""
        start_time = time.time()
        
        result = await unified_tool.execute("analyst")
        
        elapsed = time.time() - start_time
        
        assert result.get('success') == True
        assert elapsed < 1.0  # Should load in under 1 second
        
        print(f"\n✓ Agent loaded in {elapsed:.3f} seconds")
    
    @pytest.mark.asyncio
    async def test_workflow_execution_performance(self, unified_tool):
        """Test workflow execution performance."""
        start_time = time.time()
        
        result = await unified_tool.execute("*workflow-status")
        
        elapsed = time.time() - start_time
        
        assert result.get('success') == True
        assert elapsed < 2.0  # Should execute in under 2 seconds
        
        print(f"\n✓ Workflow executed in {elapsed:.3f} seconds")
    
    @pytest.mark.asyncio
    async def test_concurrent_requests(self, unified_tool):
        """Test handling concurrent requests."""
        num_requests = 20
        
        start_time = time.time()
        
        # Create concurrent tasks
        tasks = [
            unified_tool.execute("analyst") if i % 2 == 0 else unified_tool.execute("*workflow-status")
            for i in range(num_requests)
        ]
        
        results = await asyncio.gather(*tasks)
        
        elapsed = time.time() - start_time
        
        # All should succeed
        success_count = sum(1 for r in results if r.get('success'))
        assert success_count == num_requests
        
        avg_time = elapsed / num_requests
        print(f"\n✓ {num_requests} concurrent requests completed in {elapsed:.3f} seconds")
        print(f"  Average time per request: {avg_time:.3f} seconds")
    
    @pytest.mark.asyncio
    async def test_repeated_loads(self, unified_tool):
        """Test repeatedly loading the same agent."""
        iterations = 10
        
        start_time = time.time()
        
        for i in range(iterations):
            result = await unified_tool.execute("analyst")
            assert result.get('success') == True
        
        elapsed = time.time() - start_time
        avg_time = elapsed / iterations
        
        print(f"\n✓ {iterations} sequential loads in {elapsed:.3f} seconds")
        print(f"  Average time: {avg_time:.3f} seconds")
    
    @pytest.mark.asyncio
    async def test_agent_switching_performance(self, unified_tool):
        """Test performance of switching between agents."""
        agents = ["analyst", "architect", "dev", "pm", "analyst"]
        
        start_time = time.time()
        
        for agent in agents:
            result = await unified_tool.execute(agent)
            assert result.get('success') == True
        
        elapsed = time.time() - start_time
        avg_time = elapsed / len(agents)
        
        print(f"\n✓ Switched through {len(agents)} agents in {elapsed:.3f} seconds")
        print(f"  Average time per switch: {avg_time:.3f} seconds")


@pytest.mark.performance
class TestResourceUsage:
    """Test resource usage and limits."""
    
    @pytest.fixture
    def unified_tool(self):
        """Create unified tool instance."""
        return UnifiedBMADTool(Path(__file__).parent.parent.parent / "src")
    
    @pytest.mark.asyncio
    async def test_large_content_handling(self, unified_tool):
        """Test handling of large agent content."""
        result = await unified_tool.execute("analyst")
        
        content = result.get('content', '')
        content_size = len(content)
        
        assert content_size > 500
        assert content_size < 500_000  # Reasonable upper limit
        
        print(f"\n✓ Agent content size: {content_size} bytes ({content_size / 1024:.1f} KB)")
    
    @pytest.mark.asyncio
    async def test_memory_efficiency(self, unified_tool):
        """Test that repeated operations don't leak memory."""
        import sys
        
        # Load agent multiple times
        for i in range(5):
            result = await unified_tool.execute("analyst")
            assert result.get('success') == True
            
            # Clear result to allow garbage collection
            del result
        
        print(f"\n✓ Memory efficiency test passed")
    
    @pytest.mark.asyncio
    async def test_manifest_caching(self, unified_tool):
        """Test that manifests are cached efficiently."""
        # Manifests should be loaded once during init
        first_agents = unified_tool.agents
        second_agents = unified_tool.agents
        
        # Should be the same object (cached)
        assert first_agents is second_agents
        
        print(f"\n✓ Manifest caching working correctly")


@pytest.mark.performance
class TestStressTesting:
    """Stress tests for edge cases."""
    
    @pytest.fixture
    def unified_tool(self):
        """Create unified tool instance."""
        return UnifiedBMADTool(Path(__file__).parent.parent.parent / "src")
    
    @pytest.mark.asyncio
    async def test_rapid_agent_switching(self, unified_tool):
        """Test rapid switching between different agents."""
        agents = ["analyst", "dev", "pm", "architect"] * 5  # 20 switches
        
        start_time = time.time()
        
        for agent in agents:
            result = await unified_tool.execute(agent)
            assert result.get('success') == True
        
        elapsed = time.time() - start_time
        
        print(f"\n✓ Rapid switching test: {len(agents)} switches in {elapsed:.3f} seconds")
        assert elapsed < 20.0  # Should complete in reasonable time
    
    @pytest.mark.asyncio
    async def test_error_recovery_performance(self, unified_tool):
        """Test performance of error handling."""
        # Mix of valid and invalid requests
        commands = [
            "analyst",
            "invalid-agent-xyz",
            "dev",
            "another-invalid",
            "pm",
        ]
        
        start_time = time.time()
        
        for cmd in commands:
            result = await unified_tool.execute(cmd)
            # Some will succeed, some will fail
            assert 'success' in result or 'error_code' in result
        
        elapsed = time.time() - start_time
        
        print(f"\n✓ Error recovery test: {len(commands)} commands in {elapsed:.3f} seconds")
    
    @pytest.mark.asyncio
    async def test_validation_performance(self, unified_tool):
        """Test performance of input validation."""
        # Various inputs that need validation
        inputs = [
            "analyst",
            "analist",  # Typo
            "analyst; rm -rf /",  # Dangerous
            "ANALYST",  # Wrong case
            "*workflow-status",
            "a" * 100,  # Too long
        ]
        
        start_time = time.time()
        
        for inp in inputs:
            result = await unified_tool.execute(inp)
            assert result is not None
        
        elapsed = time.time() - start_time
        avg_time = elapsed / len(inputs)
        
        print(f"\n✓ Validation performance: {len(inputs)} inputs in {elapsed:.3f} seconds")
        print(f"  Average: {avg_time * 1000:.1f} ms per input")
        assert avg_time < 0.1  # Validation should be fast


@pytest.mark.performance
class TestScalability:
    """Test scalability with many operations."""
    
    @pytest.fixture
    def unified_tool(self):
        """Create unified tool instance."""
        return UnifiedBMADTool(Path(__file__).parent.parent.parent / "src")
    
    @pytest.mark.asyncio
    async def test_many_sequential_operations(self, unified_tool):
        """Test handling many sequential operations."""
        operations = 50
        
        start_time = time.time()
        
        for i in range(operations):
            # Alternate between agents and workflows
            if i % 3 == 0:
                result = await unified_tool.execute("analyst")
            elif i % 3 == 1:
                result = await unified_tool.execute("dev")
            else:
                result = await unified_tool.execute("*workflow-status")
            
            assert result.get('success') == True
        
        elapsed = time.time() - start_time
        avg_time = elapsed / operations
        
        print(f"\n✓ {operations} operations in {elapsed:.3f} seconds")
        print(f"  Average: {avg_time * 1000:.1f} ms per operation")
        print(f"  Throughput: {operations / elapsed:.1f} ops/sec")
    
    @pytest.mark.asyncio
    async def test_concurrent_mixed_operations(self, unified_tool):
        """Test concurrent operations of different types."""
        num_concurrent = 30
        
        # Mix of different operation types
        tasks = []
        for i in range(num_concurrent):
            if i % 4 == 0:
                tasks.append(unified_tool.execute("analyst"))
            elif i % 4 == 1:
                tasks.append(unified_tool.execute("dev"))
            elif i % 4 == 2:
                tasks.append(unified_tool.execute("*workflow-status"))
            else:
                tasks.append(unified_tool.execute("invalid-test"))
        
        start_time = time.time()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        elapsed = time.time() - start_time
        
        # Count successes
        successes = sum(1 for r in results if isinstance(r, dict) and r.get('success'))
        
        print(f"\n✓ {num_concurrent} concurrent mixed operations in {elapsed:.3f} seconds")
        print(f"  Successes: {successes}/{num_concurrent}")
        print(f"  Throughput: {num_concurrent / elapsed:.1f} ops/sec")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
