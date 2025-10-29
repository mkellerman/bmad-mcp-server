#!/usr/bin/env node
// Run a BMAD tool command via the compiled build
// Usage:
//   npm run bmad -- "*doctor --reload" ./tests/support/fixtures/bmad_samples/6.0.0-alpha.0/bmad
//   npm run bmad -- "*list-agents" /path/to/bmad1 /path/to/bmad2
//   npm run bmad -- "*export-master-manifest" /path/to/bmad1 /path/to/bmad2

function parseArgs(argv) {
  const args = { paths: [], command: undefined };
  const rest = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      rest.push(a);
    } else if (args.command === undefined) {
      // First non-flag arg is the command
      args.command = a;
    } else {
      // Subsequent non-flag args are paths
      args.paths.push(a);
    }
  }
  return { args, rest };
}

async function main() {
  const { args, rest } = parseArgs(process.argv);
  const cmd = args.command;
  if (!cmd) {
    console.error('Usage: npm run bmad -- "<command>" [path1] [path2] ...');
    console.error('Examples:');
    console.error(
      '  npm run bmad -- "*doctor --reload" ./tests/support/fixtures/bmad_samples/6.0.0-alpha.0/bmad',
    );
    console.error(
      '  npm run bmad -- "*list-agents" /path/to/bmad1 /path/to/bmad2',
    );
    console.error(
      '  npm run bmad -- "*export-master-manifest" /path/to/bmad1 /path/to/bmad2',
    );
    process.exit(2);
  }

  // Lazy-import compiled build modules
  const { UnifiedBMADTool } = await import('../build/tools/index.js');
  const { resolveBmadPaths } = await import(
    '../build/utils/bmad-path-resolver.js'
  );
  const { MasterManifestService } = await import(
    '../build/services/master-manifest-service.js'
  );

  const projectRoot = process.cwd();

  const discovery = resolveBmadPaths({
    cwd: projectRoot,
    cliArgs: args.paths,
    envVar: process.env.BMAD_ROOT,
  });

  // Validate locations and show warnings (only for explicitly provided paths)
  // Only warn about CLI args and ENV vars, not defaults (project, user)
  const invalidLocations = discovery.locations.filter(
    (loc) =>
      loc.status !== 'valid' &&
      loc.originalPath !== undefined &&
      (loc.source === 'cli' || loc.source === 'env'),
  );
  if (invalidLocations.length > 0) {
    for (const loc of invalidLocations) {
      if (loc.status === 'not-found') {
        console.error(
          `⚠️  BMAD path not found: ${loc.originalPath} (${loc.displayName})`,
        );
      } else if (loc.status === 'missing') {
        console.error(
          `⚠️  BMAD path exists but missing required files: ${loc.originalPath} (${loc.displayName})`,
        );
        console.error(
          `   Expected: _cfg/manifest.yaml (v6) or install-manifest.yaml (v4)`,
        );
      } else if (loc.status === 'invalid') {
        console.error(
          `⚠️  BMAD path is invalid: ${loc.originalPath} (${loc.displayName})`,
        );
        if (loc.details) console.error(`   ${loc.details}`);
      }
    }
  }

  // Check if active location is valid
  if (discovery.activeLocation.status !== 'valid') {
    console.error(`\n❌ No valid BMAD installation found!`);
    console.error(`\nTo fix this, ensure your BMAD path contains either:`);
    console.error(`  • v6: A 'bmad/_cfg/manifest.yaml' file`);
    console.error(`  • v4: An 'install-manifest.yaml' file`);
    console.error(`\nTried locations:`);
    discovery.locations.forEach((loc) => {
      console.error(
        `  ${loc.status === 'valid' ? '✓' : '✗'} ${loc.displayName}: ${loc.originalPath || '(not provided)'}`,
      );
    });
    process.exit(1);
  }

  const svc = new MasterManifestService(discovery);
  const master = svc.generate();

  // Show info about what was loaded
  if (
    master.modules.length === 0 &&
    discovery.activeLocation.status === 'valid'
  ) {
    console.error(
      `⚠️  Warning: No modules found in ${discovery.activeLocation.resolvedRoot}`,
    );
  }

  // Silence noisy logs from loaders for CLI UX
  const origErr = console.error;
  const origWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};

  const bmadRoot = discovery.activeLocation.resolvedRoot || process.cwd();
  const tool = new UnifiedBMADTool({
    bmadRoot,
    discovery,
    masterManifestService: svc,
  });
  const result = await tool.execute([cmd, ...rest].join(' ').trim());

  console.error = origErr;
  console.warn = origWarn;

  if (result.success) {
    if (typeof result.content === 'string' && result.content.length > 0) {
      console.log(result.content);
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    process.exit(0);
  } else {
    console.error(result.error || 'Command failed');
    process.exit(result.exitCode ?? 1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
