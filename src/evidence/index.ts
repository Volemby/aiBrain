
import { RepoSnapshot, EvidenceIndex, RawEvidenceItem, EvidenceRecord } from '../types/index.js';
import crypto from 'crypto';

export async function resolveEvidence(rawItems: RawEvidenceItem[], snapshot: RepoSnapshot): Promise<EvidenceIndex> {
    const index: EvidenceIndex = {};

    for (const item of rawItems) {
        const id = generateEvidenceId(item);

        // Hash content if needed
        let excerptHash = item.contentHash;
        if (!excerptHash && (item.startLine !== undefined || item.snippet)) {
            // TODO: Compute hash from content if not provided
            // excerptHash = ...
            if (!excerptHash && item.snippet) {
                excerptHash = crypto.createHash('sha256').update(item.snippet).digest('hex');
            }
        }

        const record: EvidenceRecord = {
            path: item.path,
            kind: item.kind,
            startLine: item.startLine,
            endLine: item.endLine,
            excerptHash
        };

        index[id] = record;
    }

    return index;
}

function generateEvidenceId(item: RawEvidenceItem): string {
    // Stable ID based on path + location + kind
    const key = `${item.path}:${item.startLine || 0}:${item.endLine || 0}:${item.kind}`;
    // Use a hash for the ID to be compact
    return 'ev:' + crypto.createHash('sha256').update(key).digest('hex').substring(0, 12);
}
