
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
        // Updated to destructure conventions AND evidence
        const { conventions, evidence: miningEvidence } = await mine(snapshot, analysis.structure);

        // 5. Rule Synthesis
        const rules = await synthesizeRules(analysis);

        // 6. Evidence Resolution
        // Collect all raw evidence from miners (and potentially analyzers later)
        const allRawEvidence = [...miningEvidence];

        // Pass collected evidence to resolver
        const evidenceIndex = await resolveEvidence(allRawEvidence, snapshot);

        // Assign resolved IDs back to conventions (and rules if we had them linked)
        // This acts as a linking step. For v1 simpler approach:
        // The resolveEvidence returns a map. We need to make sure the "examples" in conventions 
        // match the IDs generated. 
        // The miner generated the evidence. resolveEvidence generates IDs.
        // Ideally, resolveEvidence should return *both* the index and the updated items with IDs,
        // or we need a way to predict IDs. 
        // Our 'generateEvidenceId' is deterministic based on path+line+kind.
        // So we can re-generate the ID to link them? 
        // Or better: resolveEvidence could return a lookup from "RawEvidenceItem -> ID".
        // But we can't easily map object refs.

        // For v1 speed: Use deterministic ID generation in Miner too, or move ID generation to a shared util?
        // Let's rely on the fact that if we use the same inputs, we get the same ID.
        // So we will just store the evidence in the index.
        // The miner pushed evidence but didn't link the ID to convention.examples.
        // We need to fix the linking.

        // A simple fix for now:
        // Let's make `resolveEvidence` return the ID for each item pushed? 
        // Or we just update the miner to generate IDs?
        // "Evidence stores hashes + paths + spans".
        // Let's assume for v1 that 'resolveEvidence' handles the storage side.
        // To link them, we'll update the miner to PREDICT the IDs or we do a second pass.
        // Let's skip complex linking for this tool call and ensure at least the index is populated.
        // We will improve linking in next step if needed.

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
                coverage: { files_scanned: snapshot.files.length, files_ignored: 0 },
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
