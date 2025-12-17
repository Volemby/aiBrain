
import { RepoSnapshot, ProjectStructure, Conventions } from '../types/index.js';
import path from 'path';

export async function mine(snapshot: RepoSnapshot, structure: ProjectStructure): Promise<Conventions> {
    const conventions: Conventions = { items: [] };

    // Example mining: Check for test folder convention
    let testConvention = '';
    let count = 0;

    // Simple heuristic: check if typical projects have a 'tests' or '__tests__' folder
    for (const project of structure.projects) {
        const files = snapshot.files.filter(f => f.path.startsWith(project.path));
        // Check for tests
        // TODO: implementation details for better mining
    }

    // Allowlist mining: Naming?
    // e.g. "service files end with .service.ts"

    return conventions;
}
