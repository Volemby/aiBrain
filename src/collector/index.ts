
import { Config, RepoSnapshot, FileEntry } from '../types/index.js';
import fg from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';

// Helper to read text file
const readFile = async (filePath: string): Promise<string> => {
    return fs.readFile(filePath, 'utf-8');
};

export async function collect(root: string, config: Config): Promise<RepoSnapshot> {
    // 1. Load ignores
    const gitignorePath = path.join(root, '.gitignore');
    const aibrainignorePath = path.join(root, '.aibrainignore');

    const ignores: string[] = [];

    // Config excludes
    ignores.push(...config.exclude);

    // .gitignore
    try {
        const gitignore = await fs.readFile(gitignorePath, 'utf-8');
        ignores.push(...parseIgnoreFile(gitignore));
    } catch (e) {
        // ignore missing file
    }

    // .aibrainignore
    try {
        const aibrainignore = await fs.readFile(aibrainignorePath, 'utf-8');
        ignores.push(...parseIgnoreFile(aibrainignore));
    } catch (e) {
        // ignore missing file
    }

    // default ignores if not present
    if (!ignores.includes('node_modules/**')) ignores.push('node_modules/**');
    if (!ignores.includes('.git/**')) ignores.push('.git/**');

    // 2. Scan files
    const entries = await fg(config.include, {
        cwd: root,
        ignore: ignores,
        dot: true,
        stats: true,
        absolute: true
    });

    const files: FileEntry[] = entries.map((entry: any) => ({
        path: path.relative(root, entry.path), // store relative paths
        size: entry.stats?.size || 0
    }));

    // 3. Create snapshot
    const snapshot: RepoSnapshot = {
        root,
        files,
        readText: async (filePath: string) => {
            const absPath = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
            return readFile(absPath);
        }
    };

    return snapshot;
}

function parseIgnoreFile(content: string): string[] {
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
}
