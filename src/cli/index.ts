#!/usr/bin/env node
import { Command } from 'commander';
import { Pipeline } from '../pipeline/index.js';
import { Config } from '../types/index.js';
import path from 'path';
import fs from 'fs/promises';
import { loadBaseline } from '../storage/index.js';

const program = new Command();

program
    .name('aibrain')
    .description('Repo Scanned -> Inspector Gadget')
    .version('0.1.0');

// Helper to load config
async function loadConfig(root: string): Promise<Config> {
    const defaults: Config = {
        include: ['**/*'],
        exclude: [],
        max_file_kb: 512,
        max_files: 20000,
        evidence: { store_snippets: false }
    };

    try {
        const configPath = path.join(root, '.aibrain.yml');
        // TODO: Parse YAML. For v0.1 without heavydeps, maybe JSON or simple parsing?
        // Spec says .aibrain.yml. I need a yaml parser or use a simple one.
        // Since I cannot add deps easily now, I might assume JSON or basic parsing.
        // Let's assume the user has not created config yet, or we use defaults.
        return defaults;
    } catch (e) {
        return defaults;
    }
}

program.command('init')
    .description('Initialize aibrain config')
    .action(async () => {
        const root = process.cwd();
        await fs.writeFile(path.join(root, '.aibrainignore'), '# Add patterns to ignore\n');
        await fs.writeFile(path.join(root, '.aibrain.yml'), 'include:\n  - "**/*"\nexclude:\n  - "dist/**"\n');
        console.log('Initialized .aibrain.yml and .aibrainignore');
    });

program.command('generate')
    .description('Generate Repo Brain')
    .option('--root <path>', 'Root directory', '.')
    .action(async (options) => {
        const root = path.resolve(options.root);
        const config = await loadConfig(root);

        console.log(`Scanning ${root}...`);
        const pipeline = new Pipeline(root, config);
        await pipeline.run();
        console.log('Brain generated at', config.brain_dir || 'AI_BRAIN');
    });

program.command('check')
    .description('Check compliance')
    .option('--root <path>', 'Root directory', '.')
    .action(async (options) => {
        const root = path.resolve(options.root);
        const config = await loadConfig(root);

        const pipeline = new Pipeline(root, config);
        const exitCode = await pipeline.check();
        process.exit(exitCode);
    });

program.command('baseline')
    .description('Create baseline snapshot')
    .action(async () => {
        console.log('Baseline feature pending implementation');
    });

program.parse();
