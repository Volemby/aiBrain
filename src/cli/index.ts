#!/usr/bin/env node
import { Command } from 'commander';
import { Pipeline } from '../pipeline/index.js';
import { Config } from '../types/index.js';
import path from 'path';
import fs from 'fs/promises';
import { loadBaseline, saveBaseline } from '../storage/index.js';
import yaml from 'js-yaml'; // Implementation: added js-yaml

const program = new Command();

program
    .name('aibrain')
    .description('Repo Scanned -> Inspector Gadget')
    .version('0.1.0');

// Default Configuration
const DEFAULT_CONFIG: Config = {
    include: ['**/*'],
    exclude: [], // Collector will add defaults like node_modules
    max_file_kb: 512,
    max_files: 20000,
    evidence: { store_snippets: false }
};

// Helper: Load Config with Precedence
// CLI > .aibrain.yml > Defaults
async function loadConfig(root: string, cliConfigPath?: string): Promise<Config> {
    const configPath = cliConfigPath
        ? path.resolve(process.cwd(), cliConfigPath)
        : path.join(root, '.aibrain.yml');

    let loadedConfig = {};

    try {
        const fileContent = await fs.readFile(configPath, 'utf-8');
        try {
            loadedConfig = yaml.load(fileContent) as any;
        } catch (parseError: any) {
            console.error(`\n[ERROR] Failed to parse config file at ${configPath}`);
            console.error(`Reason: ${parseError.message}\n`);
            process.exit(1);
        }
    } catch (readError) {
        // If user explicitly provided a path, we should fail if it doesn't exist
        if (cliConfigPath) {
            console.error(`\n[ERROR] Config file not found at ${configPath}\n`);
            process.exit(1);
        }
        // Otherwise (default path), just ignore and use defaults
    }

    return {
        ...DEFAULT_CONFIG,
        ...loadedConfig,
        // Ensure critical arrays are arrays if mixed in
        include: (loadedConfig as any).include || DEFAULT_CONFIG.include,
        exclude: (loadedConfig as any).exclude || DEFAULT_CONFIG.exclude
    };
}

program.command('init')
    .description('Initialize aibrain config')
    .option('-f, --force', 'Overwrite existing config files', false)
    .action(async (options) => {
        const root = process.cwd();
        const configPath = path.join(root, '.aibrain.yml');
        const ignorePath = path.join(root, '.aibrainignore');

        // Safety checks
        if (!options.force) {
            const configExists = await fs.stat(configPath).then(() => true).catch(() => false);
            const ignoreExists = await fs.stat(ignorePath).then(() => true).catch(() => false);

            if (configExists || ignoreExists) {
                console.error('\n[ERROR] Config files already exist.');
                console.error('Use --force to overwrite: aibrain init --force\n');
                process.exit(1);
            }
        }

        const defaultConfigContent = `brain_dir: AI_BRAIN

include:
  - "**/*"

exclude:
  - "**/node_modules/**"
  - "**/.git/**"
  - "**/dist/**"
  - "**/coverage/**"

max_file_kb: 512
max_files: 20000

evidence:
  store_snippets: false
`;

        await fs.writeFile(ignorePath, '# Add patterns to ignore\n.env\n.DS_Store\n');
        await fs.writeFile(configPath, defaultConfigContent);
        console.log('Initialized .aibrain.yml and .aibrainignore');
    });

program.command('generate')
    .description('Generate Repo Brain')
    .option('--root <path>', 'Root directory', '.')
    .option('--config <path>', 'Path to config file')
    .action(async (options) => {
        const root = path.resolve(options.root);
        const config = await loadConfig(root, options.config);

        console.log(`Scanning ${root}...`);
        try {
            const pipeline = new Pipeline(root, config);
            await pipeline.run();
            console.log(`\n[SUCCESS] Brain generated at ${config.brain_dir || 'AI_BRAIN'}\n`);
        } catch (e: any) {
            console.error(`\n[ERROR] Generation failed: ${e.message}\n`);
            process.exit(1);
        }
    });

program.command('check')
    .description('Check compliance')
    .option('--root <path>', 'Root directory', '.')
    .option('--config <path>', 'Path to config file')
    .action(async (options) => {
        const root = path.resolve(options.root);
        const config = await loadConfig(root, options.config);

        try {
            const pipeline = new Pipeline(root, config);
            const exitCode = await pipeline.check();
            process.exit(exitCode);
        } catch (e: any) {
            console.error(`\n[ERROR] Check failed: ${e.message}\n`);
            process.exit(1);
        }
    });

program.command('baseline')
    .description('Create baseline snapshot')
    .option('--root <path>', 'Root directory', '.')
    .option('--config <path>', 'Path to config file')
    .action(async (options) => { // Wired up baseline command
        const root = path.resolve(options.root);
        const config = await loadConfig(root, options.config);

        console.log(`Creating baseline for ${root}...`);
        try {
            // Re-use pipeline but for generic run? Or we need a specific baseline method on Pipeline?
            // Spec says "baseline stores a snapshot file".
            // Implementation plan: "Wire up the baseline command to Pipeline.runBaseline()" (if it existed)
            // But Pipeline currently has run() and check().
            // I'll make a synthetic flow here or add it to Pipeline later.
            // For now, let's just generate the brain and then save it as baseline.
            // Actually, we should check if we should add a method to Pipeline.
            // Let's instantiate Pipeline and assume we'll add `createBaseline` or similar in Phase 6.
            // For Phase 1 compliance, I will just call run() and then copy to baseline, or just log for now?
            // "Wire up the baseline command to Pipeline.runBaseline()" was the plan.
            // I'll assume Pipeline will have it.

            // Correction: I should probably just implement the logic here or add the method to Pipeline.ts
            // Since I am only editing cli/index.ts right now, I will use `pipeline.run()` and then manual save?
            // Or better, let's leave a TODO and partial implementation that relies on `pipeline.run()`.

            // Wait, I can't add methods to Pipeline.ts in this specific tool call (single file edit).
            // But I can call a method that doesn't exist if I plan to add it? No, that breaks compilation.
            // I will implement it by running generation and then calling saveBaseline directly if exported.

            const pipeline = new Pipeline(root, config);
            const brain = await pipeline.run(); // Generate fresh brain
            await saveBaseline(brain, config);  // Save as baseline
            console.log(`\n[SUCCESS] Baseline saved to ${config.brain_dir || 'AI_BRAIN'}/baseline.json\n`);

        } catch (e: any) {
            console.error(`\n[ERROR] Baseline creation failed: ${e.message}\n`);
            process.exit(1);
        }
    });

program.parse();
