
import { RepoSnapshot, ProjectStructure, ProjectType } from '../types/index.js';
import path from 'path';

export async function inferStructure(snapshot: RepoSnapshot): Promise<ProjectStructure> {
    const projects: ProjectStructure['projects'] = [];
    const boundaries: string[] = [];

    // Naive strategy: Look for marker files
    // Node
    const packageJsons = snapshot.files.filter(f => path.basename(f.path) === 'package.json');

    for (const pkg of packageJsons) {
        const dir = path.dirname(pkg.path);
        // Ignore root if it's a monorepo root? hard to tell without reading content.
        // For now, treat every package.json as a project.

        // Determine type (naive)
        let type: ProjectType = 'unknown';
        if (dir.includes('apps/') || dir.includes('services/')) type = 'app';
        else if (dir.includes('packages/') || dir.includes('libs/')) type = 'library';

        projects.push({
            path: dir,
            type,
            name: path.basename(dir) // simple name
        });

        if (dir !== '.') boundaries.push(dir);
    }

    // Python? Look for pyproject.toml or requirements.txt in non-root
    // ...

    return {
        projects,
        boundaries,
        domains: [] // Domain inference is harder, leaving empty for v0.1
    };
}
