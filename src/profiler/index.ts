
import { RepoSnapshot, Profile } from '../types/index.js';
import path from 'path';

export async function profile(snapshot: RepoSnapshot): Promise<Profile> {
    const languages = new Set<string>();
    const frameworks = new Set<string>();
    const packageManagers = new Set<string>();

    for (const file of snapshot.files) {
        const ext = path.extname(file.path);
        const name = path.basename(file.path);

        // Languages
        if (ext === '.ts' || ext === '.tsx') languages.add('TypeScript');
        if (ext === '.js' || ext === '.jsx') languages.add('JavaScript');
        if (ext === '.py') languages.add('Python');
        if (ext === '.go') languages.add('Go');
        if (ext === '.rs') languages.add('Rust');

        // Package Managers
        if (name === 'package-lock.json') packageManagers.add('npm');
        if (name === 'pnpm-lock.yaml') packageManagers.add('pnpm');
        if (name === 'yarn.lock') packageManagers.add('yarn');
        if (name === 'poetry.lock') packageManagers.add('poetry');
        if (name === 'requirements.txt') packageManagers.add('pip');

        // Frameworks (Naive check)
        if (name === 'next.config.js') frameworks.add('Next.js');
        if (name === 'vite.config.ts' || name === 'vite.config.js') frameworks.add('Vite');
        // Deeper framework check would require reading package.json dependencies, 
        // but for v0.1 we can stick to file existence or read package.json if available.
    }

    return {
        languages: Array.from(languages),
        frameworks: Array.from(frameworks),
        packageManagers: Array.from(packageManagers)
    };
}
