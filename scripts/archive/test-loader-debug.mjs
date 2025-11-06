import { ResourceLoaderGit } from '../build/lite/resource-loader-git.js';

const loader = new ResourceLoaderGit(process.cwd(), [
  'git+https://github.com/mkellerman/BMAD-METHOD.git#main:/bmad',
]);

console.log('Paths:', loader.getPaths());
console.log('\nListing agents...');
const agents = await loader.listAgents();
console.log('Found agents:', agents);

console.log('\nResolved Git paths:');
for (const [url, path] of loader.getResolvedGitPaths()) {
  console.log(`  ${url} -> ${path}`);
}
