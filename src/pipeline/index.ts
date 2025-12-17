
import { ScanContext, Brain, RepoSnapshot, Config, Analysis } from '../types/index.js';
import { collect } from '../collector/index.js';
import { profile } from '../profiler/index.js';
import { analyze } from '../analyzer/index.js';
import { mine } from '../miner/index.js';
import { synthesizeRules, checkRules } from '../rules/index.js';
import { resolveEvidence } from '../evidence/index.js';
import { render } from '../renderer/index.js';
import { saveBrain, saveBaseline, loadBaseline } from '../storage/index.js';

export class Pipeline {
    private config: Config;
    private root: string;

    constructor(root: string, config: Config) {
        this.root = root;
        this.config = config;
    }

    async run(): Promise<Brain> {
        // 1. Collector
        const snapshot: RepoSnapshot = await collect(this.root, this.config);
        const context: ScanContext = { snapshot, config: this.config };

        // 2. Profiler
        const repoProfile = await profile(snapshot);

        // 3. Analyzer
        const analysis: Analysis = await analyze(snapshot, repoProfile);

        // 4. Miner
        const conventions = await mine(snapshot, analysis.structure);

        // 5. Rule Synthesis
        const rules = await synthesizeRules(analysis);

        // 6. Evidence Resolution
        // We need to collect all raw evidence from previous steps first
        // For v1, let's assume modules return evidence IDs or raw items.
        // This part requires wiring up evidence collection which handles the mapping.
        // For now, let's assume a simplified flow where we resolve what we have.
        const evidenceIndex = await resolveEvidence([], snapshot); // TODO: Pass collected evidence

        // Construct Brain
        const brain: Brain = {
            schema_version: "1.0.0",
            brain_version: "0.1.0",
            repo: {
                root: this.root,
                generated_with: { tool: "aibrain", version: "0.1.0" }
            },
            profile: repoProfile,
            structure: analysis.structure,
            graphs: analysis.graphs,
            conventions,
            rules,
            workflows: analysis.workflows,
            evidence: evidenceIndex,
            status: {
                coverage: { files_scanned: snapshot.files.length, files_ignored: 0 }, // TODO: accurate stats
                conflicts: []
            }
        };

        // 7. Storage
        await saveBrain(brain, this.config);

        // 8. Renderer
        await render(brain, this.config);

        return brain;
    }

    async check(): Promise<number> {
        // Check flow: Load brain, load baseline, run checker
        // For check, we might not need to re-scan if we trust the brain,
        // but usually 'check' scans the current state and compares against rules.
        // So it mirrors run() but stops at rule validation.

        const snapshot: RepoSnapshot = await collect(this.root, this.config);
        const repoProfile = await profile(snapshot);
        const analysis: Analysis = await analyze(snapshot, repoProfile);

        // We load existing rules from brain.json or re-synthesize?
        // Spec says: "validates: import boundary rules against current import graphs"
        // So we use the *current* analysis.
        // And we check against the *brain's* rules (if we are enforcing a contract) or synthesized rules?
        // Usually "check" implies "enforce the rules defined in the brain".

        // TODO: Load existing brain to get specific rules/overrides
        const rules = await synthesizeRules(analysis); // Placeholder: using synthesized rules for now

        const results = await checkRules(rules, analysis);

        // TODO: proper exit code based on severity
        return results.hasHardViolations ? 2 : (results.hasWarnings ? 1 : 0);
    }
}
