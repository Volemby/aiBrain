
import { Brain, Config } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';

export async function saveBrain(brain: Brain, config: Config): Promise<void> {
    const outDir = config.brain_dir || 'AI_BRAIN';
    await fs.mkdir(outDir, { recursive: true });

    const brainPath = path.join(outDir, 'brain.json');
    await fs.writeFile(brainPath, JSON.stringify(brain, null, 2));
}

export async function saveBaseline(brain: Brain, config: Config): Promise<void> {
    const outDir = config.brain_dir || 'AI_BRAIN';
    await fs.mkdir(outDir, { recursive: true });

    const baselinePath = path.join(outDir, 'baseline.json');
    await fs.writeFile(baselinePath, JSON.stringify(brain, null, 2));
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
