
import { RepoSnapshot, Profile, Analysis } from '../types/index.js';
import { inferStructure } from './structure.js';
import { parseImports } from './imports.js';
import { extractWorkflows } from './workflows.js';

export async function analyze(snapshot: RepoSnapshot, profile: Profile): Promise<Analysis> {
    const structure = await inferStructure(snapshot);
    const graphs = await parseImports(snapshot);
    const workflows = await extractWorkflows(snapshot);

    return {
        structure,
        graphs,
        workflows
    };
}
