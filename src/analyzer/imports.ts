
import { RepoSnapshot, ImportGraph, ImportNode } from '../types/index.js';
import path from 'path';

export async function parseImports(snapshot: RepoSnapshot): Promise<ImportGraph> {
    const fileImportsTS: Record<string, ImportNode> = {};
    const fileImportsPy: Record<string, ImportNode> = {};

    // REGEX DEFINITIONS

    // TS/JS
    // static: import ... from '...'
    const tsStaticImportRegex = /import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
    // dynamic: import('...') -> we'll capture but mark specially if possible, or just treat as dependency
    // commonjs: require('...')
    const tsRequireRegex = /require\(['"]([^'"]+)['"]\)/g;
    // dynamic import() - look for import('...')
    const tsDynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;

    // Python
    // import x, y
    // from x import y
    // from . import y
    // from ..x import y
    const pyImportRegex = /^(?:from\s+([.\w]+)\s+import|import\s+([\w, ]+))/gm;

    for (const file of snapshot.files) {
        const ext = path.extname(file.path);
        const isTS = ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
        const isPy = ext === '.py';

        if (!isTS && !isPy) continue;

        const content = await snapshot.readText(file.path);
        const imports = new Set<string>();
        const specifiers: string[] = [];

        if (isTS) {
            let match;
            while ((match = tsStaticImportRegex.exec(content)) !== null) {
                imports.add(match[1]);
                specifiers.push(match[1]);
            }
            while ((match = tsRequireRegex.exec(content)) !== null) {
                imports.add(match[1]);
                specifiers.push(match[1]);
            }
            while ((match = tsDynamicImportRegex.exec(content)) !== null) {
                imports.add(match[1]);
                specifiers.push(`${match[1]} (dynamic)`);
            }

            if (imports.size > 0) {
                fileImportsTS[file.path] = {
                    path: file.path,
                    imports: Array.from(imports),
                    specifiers
                };
            }
        }

        if (isPy) {
            let match;
            // Reset regex state just in case
            pyImportRegex.lastIndex = 0;

            while ((match = pyImportRegex.exec(content)) !== null) {
                // match[1] -> from ... import
                // match[2] -> import ...

                if (match[1]) {
                    // Handle "from X import ..."
                    const moduleName = match[1];
                    let resolved = moduleName;

                    // Relative imports: .foo, ..bar
                    if (moduleName.startsWith('.')) {
                        // best effort resolution relative to file path
                        // e.g. file: apps/api/foo.py, import: .utils
                        // resolved: apps.api.utils
                        // This implies we map file paths to python modules.
                        // For v1, let's keep the raw relative string or attempt simple resolution.
                        // "apps/api/foo.py" -> module "apps.api.foo"
                        // ".utils" -> "apps.api.utils"

                        // heuristic: calculate current module path from file path
                        const fileDir = path.dirname(file.path);
                        // Convert slashes to dots?
                        // This is tricky without knowing the PYTHONPATH root
                        // We will store it as relative for now, or use a heuristic.
                        // Plan said: "Correctly resolve ... using the file's directory context"

                        // Let's store it as absolute path-like string if possible, or keep as relative
                        // If we keep it relative, the graph checker needs to know context.
                        // Let's try to resolve to a "virtual absolute" path assuming repo root is absolute.

                        // Counting dots
                        const dotCount = (moduleName.match(/^\.+/) || [''])[0].length;
                        const remainder = moduleName.substring(dotCount);

                        // each dot is one level up?
                        // from . import -> dotCount=1 (current dir)
                        // from .. import -> dotCount=2 (parent)

                        // We need the file's directory parts
                        const parts = fileDir.split(path.sep).filter(p => p !== '.');

                        // If dotCount = 1, current dir.
                        // If dotCount = 2, parent, so pop 1.
                        const popCount = dotCount - 1;

                        if (popCount <= parts.length) {
                            const base = parts.slice(0, parts.length - popCount).join('.');
                            resolved = base ? (remainder ? `${base}.${remainder}` : base) : remainder;
                        }
                    }

                    imports.add(resolved);
                    specifiers.push(moduleName);
                } else if (match[2]) {
                    // Handle "import X, Y"
                    const modules = match[2].split(',').map(s => s.trim());
                    modules.forEach(m => {
                        imports.add(m);
                        specifiers.push(m);
                    });
                }
            }

            if (imports.size > 0) {
                fileImportsPy[file.path] = {
                    path: file.path,
                    imports: Array.from(imports),
                    specifiers
                };
            }
        }
    }

    return {
        imports_ts: fileImportsTS,
        imports_py: fileImportsPy
    };
}
