
import { RepoSnapshot, Workflows, WorkflowCommand } from '../types/index.js';
import path from 'path';

export async function extractWorkflows(snapshot: RepoSnapshot): Promise<Workflows> {
    const commands: WorkflowCommand[] = [];

    for (const file of snapshot.files) {
        if (path.basename(file.path) === 'package.json') {
            try {
                const content = await snapshot.readText(file.path);
                const json = JSON.parse(content);
                if (json.scripts) {
                    for (const [name, cmd] of Object.entries(json.scripts)) {
                        commands.push({
                            name,
                            command: cmd as string,
                            cwd: path.dirname(file.path),
                            source: 'package.json',
                            confidence: 'HIGH'
                        });
                    }
                }
            } catch (e) {
                // ignore broken json
            }
        }
    }

    return { commands };
}
