
import { Brain, Config } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';

// Deterministic JSON stringify
function stableStringify(obj: any): string {
    return JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value).sort().reduce((sorted: any, k) => {
                sorted[k] = value[k];
                return sorted;
            }, {});
        }
        return value;
    }, 2);
}

export async function saveBrain(brain: Brain, config: Config): Promise<void> {
    const outDir = config.brain_dir || 'AI_BRAIN';
    await fs.mkdir(outDir, { recursive: true });

    const brainPath = path.join(outDir, 'brain.json');
    // Ensure versioning is correct (though it's set in pipeline)
    // We just write it deterministically
    await fs.writeFile(brainPath, stableStringify(brain));
}

export async function saveBaseline(brain: Brain, config: Config): Promise<void> {
    const outDir = config.brain_dir || 'AI_BRAIN';
    await fs.mkdir(outDir, { recursive: true });

    const baselinePath = path.join(outDir, 'baseline.json');
    await fs.writeFile(baselinePath, stableStringify(brain));
}

export async function loadBaseline(config: Config): Promise<Brain | null> {
    const outDir = config.brain_dir || 'AI_BRAIN';
    const baselinePath = path.join(outDir, 'baseline.json');
    try {
        const data = await fs.readFile(baselinePath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}
