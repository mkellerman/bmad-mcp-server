import { ResourceLoaderGit } from './build/core/resource-loader.js';

const loader = new ResourceLoaderGit(undefined, [
  'git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad/core',
  'git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad/bmm',
]);

console.log('Listing agents...');
const agents = await loader.listAgentsWithMetadata();
console.log(`Found ${agents.length} agents`);

// Find analyst
const analyst = agents.find((a) => a.name === 'analyst');
if (analyst) {
  console.log('\n=== Analyst Metadata ===');
  console.log(JSON.stringify(analyst, null, 2));
} else {
  console.log('\nAnalyst not found!');
}
