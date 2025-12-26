
import { RepoSnapshot, ProjectStructure, Conventions, Convention, RawEvidenceItem } from '../types/index.js';
import path from 'path';

// Helper to calculate confidence score
const scoreConfidence = (hits: number, total: number): { score: number, label: 'HIGH' | 'MED' | 'LOW' } => {
    if (total === 0) return { score: 0, label: 'LOW' };
    const ratio = hits / total;
    let label: 'HIGH' | 'MED' | 'LOW' = 'LOW';
    if (ratio > 0.8 && hits > 2) label = 'HIGH';
    else if (ratio > 0.5) label = 'MED';
    return { score: Number(ratio.toFixed(2)), label };
};

export async function mine(snapshot: RepoSnapshot, structure: ProjectStructure): Promise<{ conventions: Conventions, evidence: RawEvidenceItem[] }> {
    const findings: Convention[] = [];
    const allEvidence: RawEvidenceItem[] = [];

    // 1. Test Folder Convention
    // Check if projects consistently use 'tests' or '__tests__'
    const projects = structure.projects;
    let testsFolderHits = 0;
    let underscoreTestsHits = 0;
    const testEvidence: RawEvidenceItem[] = [];

    for (const project of projects) {
        // Look for immediate children folders
        // Simple string check on paths
        // We look for project.path + /tests or /__tests__
        const testsPath = path.join(project.path, 'tests');
        const underscoreTestsPath = path.join(project.path, '__tests__');

        const hasTests = snapshot.files.some(f => f.path.startsWith(testsPath));
        const hasUnderscore = snapshot.files.some(f => f.path.startsWith(underscoreTestsPath));

        if (hasTests) {
            testsFolderHits++;
            testEvidence.push({ path: testsPath, kind: 'code', snippet: 'tests directory exists' });
        }
        if (hasUnderscore) {
            underscoreTestsHits++;
            testEvidence.push({ path: underscoreTestsPath, kind: 'code', snippet: '__tests__ directory exists' });
        }
    }

    if (testsFolderHits > 0 && testsFolderHits >= underscoreTestsHits) {
        const { score, label } = scoreConfidence(testsFolderHits, projects.length);
        findings.push({
            conv_id: 'conv:structure:tests_folder',
            description: 'Projects use a "tests" directory for testing.',
            confidence: label,
            score,
            evidence_count: testsFolderHits,
            examples: [] // Populated later by ID resolution
        });
        allEvidence.push(...testEvidence);
    } else if (underscoreTestsHits > 0) {
        const { score, label } = scoreConfidence(underscoreTestsHits, projects.length);
        findings.push({
            conv_id: 'conv:structure:underscore_tests',
            description: 'Projects use a "__tests__" directory for testing.',
            confidence: label,
            score,
            evidence_count: underscoreTestsHits,
            examples: []
        });
        allEvidence.push(...testEvidence);
    }

    // 2. Naming Conventions (e.g. .service.ts)
    // Scan all files for common suffixes
    const suffixHits: Record<string, number> = {};
    const suffixEvidence: Record<string, RawEvidenceItem[]> = {};

    // Only verify .ts files for now
    const tsFiles = snapshot.files.filter(f => f.path.endsWith('.ts') && !f.path.endsWith('.d.ts'));

    for (const file of tsFiles) {
        const basename = path.basename(file.path);
        const parts = basename.split('.');
        // Check for pattern name.type.ts
        if (parts.length >= 3) {
            const type = parts[parts.length - 2]; // e.g. 'service' from 'user.service.ts'
            if (['service', 'controller', 'resolver', 'module', 'dto', 'entity'].includes(type)) {
                suffixHits[type] = (suffixHits[type] || 0) + 1;
                if (!suffixEvidence[type]) suffixEvidence[type] = [];
                // Only store a few examples to avoid huge evidence list
                if (suffixEvidence[type].length < 10) {
                    suffixEvidence[type].push({
                        path: file.path,
                        kind: 'code',
                        snippet: `File follows .${type}.ts naming`
                    });
                }
            }
        }
    }

    for (const [type, hits] of Object.entries(suffixHits)) {
        if (hits >= 2) {
            findings.push({
                conv_id: `conv:naming:${type}_suffix`,
                description: `Files representing ${type}s should use the .${type}.ts suffix.`,
                confidence: hits > 5 ? 'HIGH' : 'MED',
                score: 1.0, // Hard to calc total universe for "potential services", so we default high if enough hits
                evidence_count: hits,
                examples: []
            });
            allEvidence.push(...suffixEvidence[type]);
        }
    }

    return {
        conventions: { items: findings },
        evidence: allEvidence
    };
}
