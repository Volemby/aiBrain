
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

    // Default Ignores (Phase 2 Requirement)
    const defaults = ['node_modules/**', '.git/**', 'dist/**', '.next/**', 'coverage/**', '.venv/**'];
    defaults.forEach(d => {
        if (!ignores.includes(d)) ignores.push(d);
    });

    // 2. Scan files
    const entries = await fg(config.include, {
        cwd: root,
        ignore: ignores,
        dot: true,
        stats: true,
        absolute: true,
        onlyFiles: true
    });

    // Filter by allowed extensions (Phase 2 Requirement)
    // .ts, .tsx, .js, .jsx, .py
    const ALLOWED_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.py'];

    let processedEntries = entries.filter((entry: any) => {
        const ext = path.extname(entry.path);
        return ALLOWED_EXTS.includes(ext);
    });

    // Deterministic Sort (Phase 2 Requirement)
    // Sort alphabetically by relative path
    processedEntries.sort((a: any, b: any) => {
        const pathA = path.relative(root, a.path);
        const pathB = path.relative(root, b.path);
        return pathA.localeCompare(pathB);
    });

    // Enforce Max File Size (Phase 2 Requirement)
    // We already have stats. Skip filtered out files.
    const maxBytes = (config.max_file_kb || 512) * 1024;

    const files: FileEntry[] = [];

    for (const entry of processedEntries) {
        const stats = (entry as any).stats;
        if (stats.size > maxBytes) {
            // TODO: In a real world scenario, we might want to log this to Status
            // For now we just silently skip or maybe valid to log to stderr in verbose mode
            continue;
        }

        files.push({
            path: path.relative(root, (entry as any).path),
            size: stats.size
        });

        if (files.length >= (config.max_files || 20000)) {
            break;
        }
    }

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
