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

# Web Import Command Fix

- [x] Plan: verify the actual globally linked `int` target before changing command behavior.
- [x] Implement: add `import web` to the real `C:\Users\June\Desktop\Int` CLI with a modular PDF backend.
- [x] Verify: run syntax checks, smoke test, and a real branch-level web import through the global `int`.
- [x] Review: document the verified behavior and remaining risk.

## Review

- Root cause: global `int` was linked to `C:\Users\June\Desktop\Int`, while the first implementation was in `C:\Users\June\Documents\New project`.
- Added Playwright-backed web-to-PDF import in `src\webImport.mjs`.
- Added `import web` handling in `src\cli.mjs`; it is branch-only and prompts with `type>`.
- Added `web` item title/display support in `src\items.mjs` and `src\ui.mjs`.
- Verification passed:
  - `node --check src\cli.mjs src\ui.mjs src\items.mjs src\webImport.mjs src\config.mjs`
  - `npm run smoke`
  - URL normalization for `example.com`
  - Global `int` flow created a branch web import for `https://example.com`, saved `Example Domain`, and generated an 18 KB PDF.
  - `npm pack --dry-run` includes `src\webImport.mjs`.

# Web Import Timeout Fallback

- [x] Plan: cap PDF rendering at 30 seconds and preserve the URL even if rendering fails.
- [x] Implement: make web import create a link-only item when PDF generation times out or errors.
- [x] Verify: run syntax/smoke checks plus normal PDF and forced-timeout fallback flows.
- [x] Review: document the verified behavior and remaining risk.

## Review

- Web import now uses a 30 second capture timeout.
- Navigation waits for `domcontentloaded`, then briefly waits for `load` and a 1.5 second settle delay instead of waiting for `networkidle`.
- If PDF capture fails, `import web` still creates a `web` item with `sourceUrl`, `pdfPath: null`, and `captureError`.
- Verification passed:
  - `node --check src\cli.mjs src\items.mjs src\ui.mjs src\webImport.mjs`
  - `npm run smoke`
  - Normal `https://example.com` PDF render generated an 18 KB PDF.
  - Forced bad URL flow through global `int` saved a URL-only web item and displayed `PDF: not captured`.
  - `npm pack --dry-run` includes `src\webImport.mjs`.

# Open Web Import

- [x] Plan: add an `open` command for the current web item.
- [x] Implement: open saved PDFs with the OS default PDF viewer and URL-only items with the OS default browser.
- [x] Verify: run syntax/smoke checks and direct opener command construction checks.
- [x] Review: document behavior and remaining risk.

## Review

- Added `src\openTarget.mjs` for platform-specific default app commands.
- Added `open` command for current `web` items.
- If the saved PDF file exists, `open` launches that PDF through the OS default viewer.
- If no PDF is saved, `open` launches `sourceUrl` through the OS default browser.
- Verification passed:
  - `node --check src\cli.mjs src\openTarget.mjs src\ui.mjs`
  - `npm run smoke`
  - direct checks for Windows command construction, macOS command construction, PDF target selection, and URL fallback selection.

# Web Import Display Names

- [x] Plan: keep raw URL/PDF paths in data but show the page name in terminal output.
- [x] Implement: use one display-name helper for web context, import result, and open result messages.
- [x] Verify: run syntax/smoke checks and direct display checks.
- [x] Review: document behavior.

## Review

- Added `webDisplayName()` and reused it for web import result, context display, and `open` result messages.
- Stored `sourceUrl` and `pdfPath` are unchanged internally.
- Terminal output now shows:
  - `URL: Page Name`
  - `PDF: Page Name` when a PDF exists
  - `PDF: not captured` for link-only imports
  - `Opened PDF: Page Name` or `Opened URL: Page Name`
- Verification passed:
  - `node --check src\cli.mjs src\items.mjs src\ui.mjs`
  - `npm run smoke`
  - direct display checks for PDF-backed and URL-only web items.

# Web Import PDF-Only Display

- [x] Plan: hide the URL line when a web item has a captured PDF.
- [x] Implement: show only `PDF: Page Name` for PDF-backed web items.
- [x] Verify: run syntax/smoke checks and direct display checks.
- [x] Review: document behavior.

## Review

- PDF-backed web items now show only `PDF: Page Name`.
- Link-only web items still show `URL: Page Name` and `PDF: not captured`.
- Verification passed:
  - `node --check src\ui.mjs`
  - `npm run smoke`
  - direct `printContext()` checks for PDF-backed and link-only web items.

# Web Import Link-Only Display

- [x] Plan: hide the PDF status line when a web import only has a URL.
- [x] Implement: show only `URL: Page Name` for link-only web items.
- [x] Verify: run syntax/smoke checks and direct display checks.
- [x] Review: document behavior.

## Review

- Link-only web items now show only `URL: Page Name`.
- PDF-backed web items still show only `PDF: Page Name`.
- Verification passed:
  - `node --check src\ui.mjs`
  - `npm run smoke`
  - direct `printContext()` checks for PDF-backed and link-only web items.

# PDF Import Command

- [x] Plan: add `import pdf` as a branch-attached import that opens a file picker immediately.
- [x] Implement: select a PDF, copy it into app data, create a `pdf` item, and support `open`.
- [x] Verify: run syntax/smoke checks, copied-file import, queue inclusion, and open target selection checks.
- [x] Review: document behavior and risk.

## Review

- Added `import pdf`; it opens a native file picker in normal use and imports the selected PDF under the current branch.
- Added `src\fileDialog.mjs` for Windows/macOS/Linux file selection.
- Added `src\pdfImport.mjs` to copy selected PDFs into `imports\pdf`.
- Added `pdf` item creation, display, queue inclusion through the existing non-flashcard queue path, and `open` support.
- Verification passed:
  - `node --check src\cli.mjs src\items.mjs src\ui.mjs src\openTarget.mjs src\fileDialog.mjs src\pdfImport.mjs`
  - `npm run smoke`
  - direct PDF copy/open-target check
  - global `int` import flow with `INT_PDF_IMPORT_FILE`
  - `que` showed the imported PDF as item `2/2`
  - `npm pack --dry-run` includes the new modules.
- Remaining risk: the native file picker itself was not manually clicked during automated verification; the Windows/macOS command paths are implemented, and test import used the same import backend through an env-provided PDF path.

# Import Stay In Branch

- [x] Plan: imports should attach to the current branch without entering the new item.
- [x] Implement: make successful `import web` and `import pdf` return the original branch context.
- [x] Verify: run syntax/smoke checks and global CLI import flows that stay on branch.
- [x] Review: document behavior.

## Review

- `import web` now returns the original branch context after both PDF-backed success and link-only fallback.
- `import pdf` now returns the original branch context after success.
- Verification passed:
  - `node --check src\cli.mjs`
  - `npm run smoke`
  - global `int` PDF import flow stayed on `[branch] StayBranch` and listed the new `[pdf]` child.
  - global `int` web fallback flow stayed on `[branch] StayWebBranch` and listed the new `[web]` child.

# macOS PDF Picker Cancel

- [x] Plan: treat macOS PDF picker cancellation as a normal cancel.
- [x] Implement: return `null` when AppleScript reports user cancel.
- [x] Verify: run syntax/smoke checks and direct cancel-message classification checks.
- [x] Review: document behavior.

## Review

- macOS `osascript` user-cancel errors now return `null`, so `import pdf` prints `Canceled.` instead of `PDF selection failed`.
- Non-cancel AppleScript failures still throw and remain diagnosable.
- Verification passed:
  - `node --check src\fileDialog.mjs`
  - `npm run smoke`
  - direct `isMacUserCancel()` checks for `User canceled. (-128)` and non-cancel errors.

# Pre-Push Review

- [x] Plan: inspect uncommitted import/open changes, ignored data state, and package contents before pushing.
- [x] Implement: add the new Playwright dependency to the help license list.
- [x] Verify: run syntax checks, smoke test, package dry run, targeted import/open checks, and a real web PDF render.
- [x] Review: commit and push the verified changes.

## Review

- `data/` remains ignored and no data files are tracked for this push.
- `node --check` passed for the changed CLI and new import/open modules.
- `npm run smoke` passed.
- `npm pack --dry-run` includes README, package metadata, and source modules only.
- Targeted checks passed for URL normalization, PDF copy, open target selection, platform opener commands, and macOS cancel classification.
- Real `https://example.com/` web render produced `Example Domain` as an 18 KB PDF.

# Third-Party Notices And Help Audit

- [x] Plan: move third-party license details into a dedicated notice file and compare help against implemented commands.
- [x] Implement: add `THIRD_PARTY_NOTICES.md`, include it in npm files, link it from README, and update help aliases/details.
- [x] Verify: run syntax checks, smoke test, help output check, and package dry run.
- [x] Review: commit and push the verified changes.

## Review

- Added `THIRD_PARTY_NOTICES.md` with Playwright and ts-fsrs notices.
- Added `THIRD_PARTY_NOTICES.md` to `package.json` files so npm installs include it.
- Help output now mentions the `previous` alias, expanded multi-delete syntax, and the notice file.
- README license section now points to `THIRD_PARTY_NOTICES.md`.
- Verification passed:
  - `node --check src\ui.mjs`
  - `node --check src\cli.mjs`
  - `npm run smoke`
  - help output grep for notice and alias lines
  - `npm pack --dry-run` includes `THIRD_PARTY_NOTICES.md`

# Save Link Command

- [x] Plan: reuse the web fallback data shape as an explicit `save link` command.
- [x] Implement: add branch-only `save link` command with `type>` URL prompt and no PDF capture.
- [x] Verify: run syntax checks, smoke test, help output check, package dry run, and link-only item shape check.
- [x] Review: commit and push the verified changes.

## Review

- Added `save link` under branch contexts.
- `save link` prompts with `type>`, normalizes `example.com` to `https://example.com/`, creates a `web` item, and keeps `pdfPath` null.
- The command stays in the current branch, matching `import web` / `import pdf`.
- README and help now list `save link`.
- Verification passed:
  - `node --check src\cli.mjs`
  - `node --check src\ui.mjs`
  - `npm run smoke`
  - help output grep for `save link`
  - link-only item data shape check
  - `npm pack --dry-run`

# Prompt Kit Migration

- [x] Plan: replace the fragile custom command/type raw-line renderer with a prompt library while keeping existing prompt text.
- [x] Implement: add `@inquirer/core`, route `int>` and `type>` style prompts through it, and guard canceled commands.
- [x] Verify: run syntax checks, smoke test, help license check, and package dry run.
- [x] Review: update notices/help, commit, and push.

## Review

- Replaced the custom command/type raw-line renderer with a small `@inquirer/core` prompt wrapper.
- Removed the gray ANSI prompt-line background path that was causing terminal resize and line-wrap artifacts.
- Kept prompt text as `int>` and `type>`.
- Added a null guard so canceled command prompts no longer call `.trim()` on `null`.
- Avoid creating a competing readline interface in TTY mode; raw flashcard review input still uses the existing focused handler.
- Added `@inquirer/core` to help and `THIRD_PARTY_NOTICES.md`; updated Node engine to `>=20.12` to match Inquirer requirements.
- Verification passed:
  - `node --check src\input.mjs`
  - `node --check src\cli.mjs`
  - `node --check src\ui.mjs`
  - `npm run smoke`
  - help output grep for `@inquirer/core`
  - `npm pack --dry-run`
