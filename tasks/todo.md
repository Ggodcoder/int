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
