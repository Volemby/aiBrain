
// Basic types
export interface Config {
    brain_dir?: string;
    max_file_kb?: number;
    max_files?: number;
    include: string[];
    exclude: string[];
    evidence?: {
        store_snippets: boolean;
    };
}

export interface FileEntry {
    path: string;
    // Size can be useful for stats
    size: number;
}

export interface RepoSnapshot {
    root: string;
    files: FileEntry[];
    readText(path: string): Promise<string>;
}

export interface ScanContext {
    snapshot: RepoSnapshot;
    config: Config;
}

export interface Profile {
    languages: string[];
    frameworks: string[];
    packageManagers: string[];
}

export type ProjectType = 'app' | 'package' | 'service' | 'library' | 'unknown';

export interface ProjectStructure {
    projects: {
        path: string;
        type: ProjectType;
        name?: string;
    }[];
    boundaries: string[];
    domains: string[];
}

export interface ImportNode {
    path: string; // normalized file path or module name
    imports: string[]; // paths it imports
}

export interface ImportGraph {
    imports_ts: Record<string, ImportNode>;
    imports_py: Record<string, ImportNode>;
    // workspace_deps could go here too
}

export interface WorkflowCommand {
    name: string;
    command: string;
    cwd?: string;
    source: 'package.json' | 'makefile' | 'docker-compose' | 'readme';
    confidence: 'HIGH' | 'MED' | 'LOW';
}

export interface Workflows {
    commands: WorkflowCommand[];
}

export interface Analysis {
    structure: ProjectStructure;
    graphs: ImportGraph;
    workflows: Workflows;
}

export interface Convention {
    conv_id: string;
    description: string;
    confidence: 'HIGH' | 'MED' | 'LOW' | 'CONFLICT';
    examples: string[]; // evidence IDs
}

export interface Conventions {
    items: Convention[];
}

// Rule DSL types
export type RuleType = 'no_import' | 'allowed_imports' | 'layer_order' | 'no_cross_project_import' | 'must_use_command' | 'naming_convention';

export interface Rule {
    rule_id: string;
    type: RuleType;
    params: Record<string, any>;
    severity: 'HARD' | 'SOFT' | 'UNKNOWN';
    rationale?: string;
    evidence: string[]; // evidence IDs
    scope?: string[];
}

export interface Rules {
    policy: {
        fail_on_warnings: boolean;
        confidence_to_severity: Record<string, 'HARD' | 'SOFT' | 'UNKNOWN'>;
    };
    items: Rule[];
}

// Evidence
export type EvidenceKind = 'code' | 'config' | 'doc';

export interface RawEvidenceItem {
    path: string;
    kind: EvidenceKind;
    startLine?: number;
    endLine?: number;
    contentHash?: string;
    snippet?: string; // Optional raw content
}

export interface EvidenceRecord {
    path: string;
    kind: EvidenceKind;
    startLine?: number;
    endLine?: number;
    excerptHash?: string;
}

export type EvidenceIndex = Record<string, EvidenceRecord>;

// Validation/Status
export interface Status {
    coverage: {
        files_scanned: number;
        files_ignored: number;
    };
    conflicts: string[];
}

// The Big Brain
export interface Brain {
    schema_version: string;
    brain_version: string;
    repo: {
        root: string;
        git_commit?: string;
        generated_with: { tool: string; version: string };
    };
    profile: Profile;
    structure: ProjectStructure;
    graphs: ImportGraph;
    conventions: Conventions;
    rules: Rules;
    workflows: Workflows;
    evidence: EvidenceIndex;
    status: Status;
}
