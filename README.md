# AI Brain

> **Repo Scanned → Inspector Gadget**

`aibrain` is a local-first CLI tool that scans your git repository, extracts structure, conventions, and constraints, and generates a **versioned Repo Brain**. This brain serves as a "machine truth" for your codebase, enabling both humans and AI agents to understand and work with your project more effectively.

Unlike generic linters or documentation generators, `aibrain` focuses on **evidence-backed rules** and **deterministic generation**, giving you a powerful way to enforce architecture and onboarding norms without manual overhead.

## Features

-   **🧠 Schema-First Brain**: Generates a canonical `AI_BRAIN/brain.json` that models your repo's structure, dependencies, and rules.
-   **🛡️ Enforceable Checks**: Run `aibrain check` to validate your code against the generated brain and baseline.
-   **📄 Human-Readable Docs**: Automatically renders architecture maps, convention guides, and agent instructions.
-   **🔒 Local & Private**: No code is uploaded anywhere. Everything runs locally on your machine.
-   **🔁 Deterministic**: Same repo state + same config = same output.

## Installation

```bash
npm install -g aibrain
# OR run directly with npx
npx aibrain --help
```

## Quick Start

### 1. Initialize
Run `init` in your project root to create the configuration files.

```bash
aibrain init
```
This creates:
-   `.aibrain.yml`: Your configuration file.
-   `.aibrainignore`: Patterns to exclude from the scan.

### 2. Generate the Brain
Scan your repository and generate the brain artifacts.

```bash
aibrain generate
```
This will populate the `AI_BRAIN/` directory with:
-   `brain.json`: The raw data model.
-   `README.md`, `ARCHITECTURE_MAP.md`, etc.: Generated documentation.

### 3. Check Compliance
Verify that your current codebase adheres to the generated rules and established baseline.

```bash
aibrain check
```

## Configuration (`.aibrain.yml`)

The tool is highly configurable via `.aibrain.yml`.

```yaml
brain_dir: AI_BRAIN

# What to scan
include:
  - "**/*"

# What to ignore (merged with .aibrainignore and .gitignore)
exclude:
  - "**/node_modules/**"
  - "**/dist/**"

# Safety caps
max_file_kb: 512
max_files: 20000

# Enforcement settings
enforcement_policy:
  fail_on_warnings: false
  confidence_to_severity:
    HIGH: HARD
    MED: SOFT
```

## Commands

-   `aibrain init`: Set up config files.
-   `aibrain generate`: Scan repo and update the brain.
-   `aibrain check`: Validate repo against the brain.
-   `aibrain baseline`: Snapshot the current state as a baseline (useful for legacy projects).
-   `aibrain report`: Generate a readable HTML/Markdown report of the last scan.

## License

ISC © 2024 Vojtech Horak
