# Output Spacing Cleanup

- [x] Plan: centralize command result spacing with one shared output block helper.
- [x] Implement: route remaining result-style output through the shared helper.
- [x] Verify: run syntax checks and smoke tests.
- [x] Review: document the verified behavior and remaining risk.

## Review

- `node --check src\cli.mjs` and `node --check src\ui.mjs` passed.
- `npm run smoke` passed.
- `npm pack --dry-run` passed and includes only package source/docs files.
- Remaining risk: exact visual spacing in every interactive terminal path still depends on the host terminal's line wrapping, but result-style outputs now share one helper.

# Intro Metadata

- [x] Plan: show app version and developer name between the logo and help hint.
- [x] Implement: read the package version in the intro renderer and add the metadata lines.
- [x] Verify: run syntax checks, smoke test, and intro output check.

## Review

- `node --check src\ui.mjs` and `node --check src\cli.mjs` passed.
- `npm run smoke` passed.
- Intro output now includes `Version 0.1.0` and `Developer Jay` before `Type help for commands.`

# Empty Home Guidance

- [x] Plan: show a one-line English guide when the home screen has no roots.
- [x] Implement: print the guide under the intro instead of leaving the content area empty.
- [x] Verify: run syntax checks, smoke test, and empty-home output check.

## Review

- `node --check src\ui.mjs` and `node --check src\cli.mjs` passed.
- `npm run smoke` passed.
- Empty-home output includes `Create your first root with "new root".`

# Intro Metadata Simplification

- [x] Plan: replace the two intro metadata lines with one compact line.
- [x] Implement: render `version n.n.n by Jay` under the logo.
- [x] Verify: run syntax checks, smoke test, and intro output check.

## Review

- `node --check src\ui.mjs` and `node --check src\cli.mjs` passed.
- `npm run smoke` passed.
- Intro output now includes `version 0.1.0 by Jay` and no separate `Version` / `Developer` lines.
