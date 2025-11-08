/**
 * Type declarations for our local manifest-generator.js
 */

export class ManifestGenerator {
  constructor();
  generateManifests(
    bmadDir: string,
    selectedModules: string[],
    installedFiles: string[],
    options: {
      ides: string[];
      preservedModules: string[];
      scanDir?: string;
      bmadRoot?: string;
    },
  ): Promise<{
    workflows: number;
    agents: number;
    tasks: number;
    tools: number;
    files: number;
    manifestFiles: string[];
  }>;
}
