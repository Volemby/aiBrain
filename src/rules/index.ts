
import { Analysis, Rules, Rule, ImportGraph, ImportNode } from '../types/index.js';
import path from 'path';

export async function synthesizeRules(analysis: Analysis): Promise<Rules> {
    const generatedRules: Rule[] = [];

    // Synthesize: No Cross Project Import
    // If we have multiple projects, enforce boundaries
    // Rule: Anything in project A cannot import project B unless explicit exception
    if (analysis.structure.projects.length > 1) {

        // Find all project root paths
        const projects = analysis.structure.projects; // { path: 'apps/web', name: 'web' }

        // Generate a matrix of restrictions
        for (const sourceProj of projects) {
            for (const targetProj of projects) {
                if (sourceProj.path === targetProj.path) continue;

                // Allow library imports? 
                // Usually apps depend on libs, but libs don't depend on apps.
                // Apps don't depend on other apps.
                // For v1 "no_cross_project_import" is generic: "Project A cannot import Project B"
                // Unless we define dependencies.
                // Let's create a generic rule: "Projects should be isolated"
                // Actually, the spec says: params: { "projects": ["apps/web", "apps/api"], "exceptions": [...] }

                // Let's generate one rule per pair or one global rule?
                // Spec example: no_cross_project_import params { projects: [...], exceptions: [] }
                // This implies a single rule that says "These listed projects are mutually exclusive".

                // Let's group all 'app' types
                const apps = projects.filter(p => p.type === 'app').map(p => p.path);
                if (apps.length > 1) {
                    generatedRules.push({
                        rule_id: `rule:boundary:isolation:apps`,
                        type: 'no_cross_project_import',
                        severity: 'HARD',
                        params: {
                            projects: apps,
                            exceptions: [] // shared utils?
                        },
                        rationale: 'Applications must not import code from other applications.',
                        evidence: []
                    });
                }
            }
        }
    }

    return {
        policy: {
            fail_on_warnings: false,
            confidence_to_severity: {
                'HIGH': 'HARD',
                'MED': 'SOFT',
                'LOW': 'UNKNOWN',
                'CONFLICT': 'UNKNOWN'
            }
        },
        items: generatedRules
    };
}

export async function checkRules(rules: Rules, analysis: Analysis): Promise<{ hasHardViolations: boolean, hasWarnings: boolean, violations: any[] }> {
    const violations: any[] = [];
    let hasHardViolations = false;
    let hasWarnings = false;

    // Merge TS and Py import graphs
    // We treat them identically for boundary checks
    const allImports: Record<string, ImportNode> = { ...analysis.graphs.imports_ts, ...analysis.graphs.imports_py };

    for (const rule of rules.items) {
        if (rule.type === 'no_cross_project_import') {
            const forbiddenProjects = rule.params.projects as string[]; // e.g. ['apps/web', 'apps/api']
            const exceptions = (rule.params.exceptions || []) as string[];

            for (const [filePath, node] of Object.entries(allImports)) {
                // Determine which project this file belongs to
                // We assume forbiddenProjects are prefixes relative to repo root
                const sourceProject = forbiddenProjects.find(p => filePath.startsWith(p + path.sep) || filePath === p);

                if (!sourceProject) continue; // File is not in a restricted project

                // Check imports
                node.imports.forEach((imp, idx) => {
                    // Check if imported path belongs to another forbidden project
                    // 'imp' might be relative or absolute-virtual or external module
                    // If it is external (start with 'react'), ignore.
                    // If it starts with '.', resolve it relative to file.
                    // If it is 'apps/api/...' -> check.

                    let resolvedImport = imp;
                    if (imp.startsWith('.')) {
                        resolvedImport = path.join(path.dirname(filePath), imp);
                    }
                    // Normalize
                    resolvedImport = path.normalize(resolvedImport);

                    const targetProject = forbiddenProjects.find(p => resolvedImport.startsWith(p + path.sep) || resolvedImport === p);

                    if (targetProject && targetProject !== sourceProject) {
                        // FOUND VIOLATION
                        const rawSpecifier = node.specifiers?.[idx] || imp;

                        // Check exceptions
                        if (!exceptions.some(ex => rawSpecifier.includes(ex))) {
                            const violation = {
                                ruleId: rule.rule_id,
                                severity: rule.severity,
                                from: filePath,
                                to: resolvedImport,
                                importSpecifier: rawSpecifier,
                                message: `Project '${sourceProject}' cannot import from '${targetProject}'`
                            };

                            violations.push(violation);
                            if (rule.severity === 'HARD') hasHardViolations = true;
                            if (rule.severity === 'SOFT') hasWarnings = true;
                        }
                    }
                });
            }
        }
    }

    return { hasHardViolations, hasWarnings, violations };
}
