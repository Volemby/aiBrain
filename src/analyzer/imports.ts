
import { RepoSnapshot, ImportGraph, ImportNode } from '../types/index.js';
import path from 'path';

export async function parseImports(snapshot: RepoSnapshot): Promise<ImportGraph> {
    const fileImports: Record<string, ImportNode> = {};

    // Regex-based parsing (as allowed by spec v1)
    // TS/JS: import ... from '...'
    const tsImportRegex = /import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
    // CommonJS: require('...')
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

    for (const file of snapshot.files) {
        const ext = path.extname(file.path);
        if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) continue;

        const content = await snapshot.readText(file.path);
        const imports: string[] = [];

        let match;
        while ((match = tsImportRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }
        while ((match = requireRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        if (imports.length > 0) {
            fileImports[file.path] = {
                path: file.path,
                imports: Array.from(new Set(imports)) // dedupe
            };
        }
    }

    return {
        imports_ts: fileImports,
        imports_py: {} // TODO: Python support
    };
}
