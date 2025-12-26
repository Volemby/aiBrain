# Getting Started
 
`aibrain` is a local-first CLI tool that scans your git repository, extracts structure, conventions, and constraints, and generates a **versioned Repo Brain**.
 
## Installation
 
```bash
npm install -g aibrain
```
 
Or run directly with `npx`:
 
```bash
npx aibrain --help
```
 
## Quick Start
 
### 1. Initialize
Run `init` in your project root.
 
```bash
aibrain init
```
This creates `.aibrain.yml` and `.aibrainignore`.
 
### 2. Generate
Scan your repository.
 
```bash
aibrain generate
```
This populates the `AI_BRAIN/` directory.
 
### 3. Check
Verify compliance.
 
```bash
aibrain check
```
