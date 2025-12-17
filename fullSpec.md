## Repo Scanner → Repo Brain Generator (v1 Spec for Implementation)

### 0) One-sentence definition

A local-first CLI tool that scans a git repository, extracts **structure + conventions + enforceable constraints** with evidence, and generates a **versioned Repo Brain** that can be used both by humans and AI agents—and a **check** mode that enforces the brain against the repo.

---

## 1) v1 Outcomes

### v1 must deliver

1. **Deterministic generation**
   Same repo state + same config ⇒ same outputs (byte-stable), excluding an optional timestamp field that is off by default.
2. **Schema-first brain** (machine truth) + rendered markdown (human/agent consumption).
3. **Evidence-backed rules**
   Every enforceable rule links to evidence references (path + line range + hash).
4. **Enforceable `check`**
   A rules DSL that can be validated without an LLM.
5. **Baseline workflow**
   Adopt tool in messy repos without instant red CI.

### v1 explicitly does NOT do

* No “invented decisions” (no speculative ADR generation).
* No auto-generated bespoke task templates (v1 ships static templates that reference repo-specific findings).
* No full security scanning (may integrate later).
* No uploading code anywhere by default.

---

## 2) Primary user + target repo types (v1)

* Primary target: **monorepos or multi-service repos** with **TypeScript/JavaScript + Python**.
* Supported extractors in v1:

  * TS/JS: import graph + package boundaries
  * Python: import graph (module-level) + typical project boundaries
  * Infra: Docker Compose discovery + common workflow commands inference (best effort)

---

## 3) Inputs

### Required

* Local path to a git repository.

### Optional

* Config file `.aibrain.yml` at repo root.
* Additional ignores `.aibrainignore`.

### Always respected

* `.gitignore` (for scanning inclusion decisions) + `.aibrainignore` + config excludes.

---

## 4) Outputs (Repo Brain)

### 4.1 Canonical machine output (source of truth)

Generated under `AI_BRAIN/`:

* `AI_BRAIN/brain.json`  **(canonical)**
* `AI_BRAIN/schema_version.txt`
* `AI_BRAIN/EVIDENCE_INDEX.json`  (may be merged into brain.json; but must exist as a separate file in v1 for tool simplicity)

**Rule:** Markdown files are rendered from `brain.json`. `check` uses `brain.json` + `EVIDENCE_INDEX.json`.

### 4.2 Rendered markdown (agent/human readable)

* `AI_BRAIN/README.md`
* `AI_BRAIN/PROJECT_INTENT.md` *(best-effort; can be user-overridden)*
* `AI_BRAIN/ARCHITECTURE_MAP.md`
* `AI_BRAIN/CONVENTIONS.md`
* `AI_BRAIN/DOMAIN_MAP.md`
* `AI_BRAIN/WORKFLOWS.md`
* `AI_BRAIN/AGENT_RULES.md`
* `AI_BRAIN/TASK_TEMPLATES/` (static, shipped by tool)
* `AI_BRAIN/agents/chatgpt.md`
* `AI_BRAIN/agents/codex.md`
* `AI_BRAIN/agents/claude.md`
* `AI_BRAIN/agents/continue.md`
* `AI_BRAIN/STATUS.md` (coverage + conflicts + confidence summary)

### 4.3 Non-committed artifacts

* `aibrain-report.md` (or `aibrain-report.html`) generated on demand.
* `aibrain-diff.md` generated on demand.

---

## 5) Determinism + Stability Requirements (hard v1 requirement)

Generation must be deterministic:

* Files are scanned in stable sorted order.
* Rules are ordered deterministically (by `rule_id`).
* No timestamps in generated files by default.
* Evidence references rely on content hashes, not raw snippets.
* Any optional non-deterministic feature must be behind an explicit flag.

---

## 6) Brain Data Model (v1) — `brain.json`

### Top-level shape

```json
{
  "schema_version": "1.0.0",
  "brain_version": "0.1.0",
  "repo": {
    "root": ".",
    "git_commit": "optional",
    "generated_with": { "tool": "aibrain", "version": "0.1.0" }
  },
  "profile": { ... },
  "structure": { ... },
  "graphs": { ... },
  "conventions": { ... },
  "rules": { ... },
  "workflows": { ... },
  "intent": { ... },
  "status": { ... }
}
```

### Key sections

#### 6.1 `profile`

* languages detected, frameworks hints, package managers, workspace layout
* confidence per detection

#### 6.2 `structure`

* `projects[]`: each app/package/service with root path + type
* `boundaries[]`: inferred boundaries (apps/packages/libs)
* `domains[]`: optional grouping (folder clusters), confidence-based

#### 6.3 `graphs`

* `imports_ts`: nodes + edges (file/module)
* `imports_py`: nodes + edges (module)
* `workspace_deps`: package/workspace dependency graph (pnpm/npm/yarn best-effort)

#### 6.4 `conventions`

A list of discovered conventions with:

* `conv_id` stable
* `description`
* `confidence`: `HIGH|MED|LOW|CONFLICT`
* `examples[]`: references to evidence ids

#### 6.5 `rules` (enforceable)

* `policy`: mapping from confidence → enforcement default
* `hard[]`, `soft[]`, `unknown[]` lists
  Each rule:
* `rule_id` stable
* `type` (from DSL types)
* `params` (structured)
* `severity`: `HARD|SOFT|UNKNOWN`
* `rationale`
* `evidence[]`: evidence ids
* `scope` (optional include/exclude patterns)

#### 6.6 `workflows`

* `commands[]`: e.g. dev, test, build, lint, migrate
* each command has evidence + confidence + notes

#### 6.7 `intent`

* `summary` (best-effort)
* `priorities[]` (optional, low confidence unless user override)
* `override_file`: points to a user-maintained file if present (see section 10)

#### 6.8 `status`

* coverage: what extractors ran + what they found
* conflicts detected
* limits hit (max file size, scan caps)
* confidence distribution

---

## 7) Evidence Index (v1) — `EVIDENCE_INDEX.json`

### Evidence item format (no raw code by default)

```json
{
  "evidence_id": "ev:sha256:....",
  "path": "apps/api/...",
  "span": { "start_line": 10, "end_line": 42 },
  "content_hash": "sha256:....",
  "kind": "config|code|doc",
  "note": "optional small label"
}
```

Rules and conventions reference evidence by `evidence_id`.

Optional flag `--include-snippets` may store short excerpts locally, but **off by default**.

---

## 8) Rules DSL (v1) — enforceable constraints

v1 ships a minimal DSL that is sufficient for real boundary enforcement:

### 8.1 Rule types

1. `no_import`

   * params: `{ "from": "<glob or boundary>", "to": "<glob or boundary>" }`
2. `allowed_imports`

   * params: `{ "from": "...", "allow": ["...", "..."] }`
3. `layer_order`

   * params: `{ "layers": ["ui", "services", "adapters", "infrastructure"], "mapping": { "ui": ["apps/web/**"], ... } }`
4. `no_cross_project_import`

   * params: `{ "projects": ["apps/web", "apps/api"], "exceptions": [...] }`
5. `must_use_command`

   * params: `{ "name": "test", "command": "pnpm test", "cwd": "..." }` *(soft by default; hard only if pinned)*
6. `naming_convention`

   * params: `{ "path": "apps/api/**", "pattern": "..." }` *(soft by default)*

### 8.2 Enforcement mapping

Default policy:

* `HIGH` → may become HARD if it’s a boundary/import rule type and has no conflicts
* `MED` → SOFT
* `LOW` → UNKNOWN
* `CONFLICT` → UNKNOWN + surfaced in report

User can override in `.aibrain.yml` and can explicitly “pin” specific rules as hard.

---

## 9) Core Pipeline (v1)

### Step A — Collection

* Walk filesystem with ignore rules.
* Apply max file size caps.
* Track scan coverage stats.

Outputs: internal file index.

### Step B — Repo Profiling

Detect:

* languages (by extensions + configs)
* package managers (pnpm/npm/yarn, poetry/pip requirements)
* workspace boundaries (pnpm-workspace.yaml, package.json workspaces)

Outputs: `profile`

### Step C — Structure Inference

Infer:

* projects (apps/packages/services)
* candidate layers (by folder names like `ui`, `services`, `adapters`, etc.)
* candidate domains (folder clusters, low confidence unless strong signals)

Outputs: `structure`

### Step D — Import Graphs

* TS/JS: parse imports from source files (regex-based is acceptable v1; AST optional)
* Python: parse import statements (module-level)
* Normalize paths and build graphs.

Outputs: `graphs.imports_ts`, `graphs.imports_py`

### Step E — Convention Mining (evidence-backed)

Mine:

* test folder conventions
* file naming patterns
* repeated “layer folder” patterns

Outputs: `conventions` with confidence + evidence examples

### Step F — Rule Synthesis (from structure + graphs)

Generate enforceable rules:

* cross-project import constraints
* layer order constraints (if layers inferred confidently)
* allowlists for shared packages/libs

Outputs: `rules` (hard/soft/unknown)

### Step G — Workflow Extraction (best-effort)

Extract commands from:

* package.json scripts
* Makefile targets (best effort)
* docker-compose hints
* README snippets (best effort; confidence low unless explicit)

Outputs: `workflows`

### Step H — Validation

* Ensure all evidence ids resolve.
* Ensure no contradictory HARD rules.
* Ensure schema validity.

### Step I — Rendering

Render markdown files from `brain.json` using stable templates.

---

## 10) User Overrides (v1, simple and critical)

### 10.1 Intent override

If file exists: `AI_BRAIN/USER_INTENT.md` (user-managed)

* Tool preserves it and uses it as the authoritative intent text.
* Tool never overwrites user-managed files.

### 10.2 Rules override/pinning

In `.aibrain.yml`:

* `pin_hard_rules`: list of rule ids or patterns
* `disable_rules`: list
* `custom_rules`: allow user to define DSL rules explicitly (with evidence optional but encouraged)

---

## 11) Drift + Baseline (core v1 feature)

### 11.1 Baseline

`aibrain baseline`

* stores a snapshot file: `AI_BRAIN/baseline.json`
* baseline captures the currently accepted graphs/rules state as “allowed”
* check compares current repo to baseline+brain to avoid instant failure on legacy mess

### 11.2 Check

`aibrain check`

* validates:

  * import boundary rules against current import graphs
  * layer order rules
  * cross-project import constraints
  * required workflow commands existence (soft unless pinned)
* outputs:

  * violations (hard)
  * warnings (soft)
  * unknown/conflicts surfaced but not enforced

Exit codes:

* `0` no hard violations
* `1` warnings only (configurable whether to fail)
* `2` hard violations

### 11.3 Report

`aibrain report`

* includes:

  * coverage summary
  * conflicts and unknowns
  * top boundary violations + file paths
  * suggested next steps (non-enforced)

---

## 12) CLI (v1)

### Commands

* `aibrain init`

  * creates `.aibrain.yml` + `.aibrainignore` (minimal)
  * does not scan by default unless `--generate`
* `aibrain generate`

  * generates/updates `AI_BRAIN/` from current repo
  * preserves user-managed override files
* `aibrain baseline`

  * creates/updates `AI_BRAIN/baseline.json`
* `aibrain check`

  * validates repo against brain + baseline
* `aibrain report`

  * writes `aibrain-report.md`
* `aibrain diff --from <commit> --to <commit>`

  * compares two `brain.json` files (by rule ids + evidence hashes), generates `aibrain-diff.md`

### Flags (v1 essentials)

* `--config <path>`
* `--brain-dir <path>`
* `--include-snippets` (off by default)
* `--ci` (machine-readable output + stable exit behavior)
* `--format json|text` for check output
* `--max-file-kb`, `--max-files`

---

## 13) Config — `.aibrain.yml` (v1)

Example:

```yaml
brain_dir: AI_BRAIN

include:
  - "**/*"
exclude:
  - "**/node_modules/**"
  - "**/.venv/**"
  - "**/dist/**"
  - "**/build/**"

max_file_kb: 512
max_files: 20000

evidence:
  store_snippets: false

enforcement_policy:
  fail_on_warnings: false
  confidence_to_severity:
    HIGH: HARD
    MED: SOFT
    LOW: UNKNOWN
    CONFLICT: UNKNOWN

rules:
  pin_hard_rules: []
  disable_rules: []
  custom_rules: []

agents:
  bundles:
    - chatgpt
    - codex
    - continue
```

---

## 14) Agent Contract (rendered in `AGENT_RULES.md`)

v1 contract must include:

1. Always read `AI_BRAIN/AGENT_RULES.md` and `AI_BRAIN/ARCHITECTURE_MAP.md`
2. Identify target project + layer + domain before editing
3. Follow hard rules (imports/boundaries)
4. If a hard rule conflicts with task requirements:

   * stop and request clarification OR propose a rule update + evidence
5. Provide compliance proof in PR/response:

   * files changed list
   * relevant commands run (from WORKFLOWS)
   * checklist mapping changes to rules

---

## 15) Static Task Templates (v1)

Shipped templates (generic) that reference brain sections:

* `TASK_TEMPLATES/add_backend_endpoint.md`
* `TASK_TEMPLATES/add_frontend_form.md`
* `TASK_TEMPLATES/refactor_module.md`
* `TASK_TEMPLATES/add_migration.md` *(if migrations detected; otherwise template remains but warns)*

These are not “auto-generated”; they are parameterized by detected paths and referenced from `DOMAIN_MAP.md` / `WORKFLOWS.md`.

---

## 16) Internal Architecture of the Tool (implementation guidance)

### Modules (recommended)

1. `collector/` (file walking + ignore + caps)
2. `profilers/` (language/framework/package detection)
3. `analyzers/`

   * `structure_inferencer`
   * `imports_ts`
   * `imports_py`
   * `workflow_extractor`
4. `miners/`

   * `convention_miner`
5. `rules/`

   * `dsl_types`
   * `rule_synthesizer`
   * `checker` (validates DSL rules against graphs)
6. `evidence/`

   * evidence id generation
   * span resolution
   * hashing
7. `renderer/` (markdown templates)
8. `storage/` (read/write brain.json + baseline.json)
9. `cli/` (commands + output formats)

### Rule ID stability (important)

`rule_id` must be derived from:

* rule type + normalized params + scope
  so it remains stable across regenerations.

---

## 17) Security & Privacy (v1)

* Default: **no network calls**.
* No raw code stored in logs.
* Evidence stores hashes + paths + spans; snippets are opt-in.
* Respect ignore rules.
* Redaction is not required in v1 if no LLM mode exists; but do not print file contents by default.

---

## 18) Quality Bar (v1 acceptance criteria)

A successful v1 run on a real repo must:

1. Generate `AI_BRAIN/brain.json` valid under schema v1.
2. Render markdown without broken references.
3. Produce at least:

   * 3 enforceable import/boundary rules (when repo has multiple projects)
   * 5 conventions with evidence
   * 5 workflow commands inferred (or explicitly mark unknown with reason)
4. `aibrain check` must detect:

   * cross-project imports when they occur
   * violations of `no_import` rules
5. Determinism: second run without repo changes yields identical outputs.

---

## 19) v1 Roadmap Hooks (clean extension points)

* LLM summarizer can be added later as a *pure post-processor* that writes only into markdown rendering layer, never the canonical JSON.
* Plugins can be introduced later but must only contribute structured findings to JSON, not write files directly.
