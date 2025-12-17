
import { Brain, Config } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';

export async function render(brain: Brain, config: Config): Promise<void> {
    const outDir = config.brain_dir || 'AI_BRAIN';
    await fs.mkdir(outDir, { recursive: true });

    // Render README.md
    const readmeContent = `# Repo Brain for ${path.basename(brain.repo.root)}

## Profile
- Languages: ${brain.profile.languages.join(', ')}
- Frameworks: ${brain.profile.frameworks.join(', ')}

## Structure
${brain.structure.projects.map(p => `- **${p.name}** (${p.type}): \`${p.path}\``).join('\n')}

## Rules
${brain.rules.items.length === 0 ? '_No rules generated._' :
            brain.rules.items.map(r => `- **${r.severity}**: ${r.type} (${r.rule_id})`).join('\n')
        }
`;

    await fs.writeFile(path.join(outDir, 'README.md'), readmeContent);

    // Render other files (stubs for v0.1)
    await fs.writeFile(path.join(outDir, 'ARCHITECTURE_MAP.md'), '# Architecture Map\n\n(Coming soon)');
    await fs.writeFile(path.join(outDir, 'CONVENTIONS.md'), '# Conventions\n\n(Coming soon)');
}
