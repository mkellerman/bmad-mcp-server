/**
 * Type declarations for bmad-method package
 * (CommonJS module without TypeScript definitions)
 */

declare module 'bmad-method/tools/cli/installers/lib/core/manifest-generator.js' {
  export class ManifestGenerator {
    constructor();
    generateManifests(
      bmadDir: string,
      selectedModules: string[],
      installedFiles: string[],
      options: { ides: string[]; preservedModules: string[] },
    ): Promise<{
      workflows: number;
      agents: number;
      tasks: number;
      tools: number;
      files: number;
      manifestFiles: string[];
    }>;
  }
}
