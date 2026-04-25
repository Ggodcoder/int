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

# Prompt Enter Value Hotfix

- [x] Plan: fix the prompt wrapper losing typed text on Enter.
- [x] Implement: keep the latest prompt line in a ref and submit that value instead of reading `rl.line` after Enter.
- [x] Verify: run syntax checks and smoke test.
- [x] Review: commit and push the hotfix.

## Review

- Root cause: by the time the Enter key handler ran, `rl.line` could already be cleared, so typed commands like `1` were submitted as empty.
- The prompt now tracks the latest line value in `latestValue` and submits that stable value.
- Verification passed:
  - `node --check src\input.mjs`
  - `node --check src\cli.mjs`
  - `npm run smoke`

# Prompt Completion And Tests

- [x] Plan: move flashcard reveal/rate prompts to the same prompt layer and add regression tests for prompt input.
- [x] Implement: replace raw flashcard prompt handlers with `@inquirer/core` prompts and add `node:test` prompt coverage.
- [x] Verify: run syntax checks, smoke, prompt tests, and package dry run.
- [x] Review: commit and push the verified changes.

## Review

- Replaced the remaining raw `space>`, `rate>`, and `result>` handlers with `@inquirer/core` prompts.
- Added prompt regression tests for numeric command input, Korean text input, Esc cancel, queue rating, and drill pass/fail.
- Added `npm run test:prompt`.
- Added `@inquirer/testing` as a dev dependency and documented it in `THIRD_PARTY_NOTICES.md`.
- Verification passed:
  - `node --check src\input.mjs`
  - `node --check src\cli.mjs`
  - `npm run smoke`
  - `npm run test:prompt`

# Notice Automation

- [x] Plan: add a dependency notice checker that prevents runtime/dev dependencies from drifting out of help and `THIRD_PARTY_NOTICES.md`.
- [x] Implement: create a script based on `npm ls --json --depth=0` plus lockfile license metadata and wire it to `npm run check:notices`.
- [x] Verify: run the new checker, syntax checks, smoke, prompt tests, and package dry run.
- [x] Review: commit and push the verified changes.

## Review

- Added `scripts/check-notices.mjs`.
- Added `npm run check:notices`.
- Runtime dependencies must appear in both help license output and `THIRD_PARTY_NOTICES.md`.
- Dev dependencies must appear in `THIRD_PARTY_NOTICES.md`.
- The checker uses `npm ls --json --depth=0` for installed top-level dependencies and `package-lock.json` for license metadata.
- Updated Playwright notice to use the SPDX value `Apache-2.0`, matching package metadata.
- Verification passed:
  - `node --check scripts\check-notices.mjs`
  - `npm run check:notices`
  - `node --check src\cli.mjs`
  - `npm run smoke`
  - `npm run test:prompt`
  - `npm pack --dry-run`

# TUI Renderer Plan

- [x] Plan: design option 3 as a full TUI renderer path for stable prompt/background/layout behavior.
- [x] Implement phase 1: add isolated TUI modules for theme tokens, layout helpers, renderer output, and prompt-line rendering without changing storage or command semantics.
- [x] Implement phase 2: replace the current line-by-line home/root/item render path with line-frame renderers.
- [ ] Implement phase 3: replace `int>`, `type>`, `space>`, `rate>`, and `result>` prompt rendering with a controlled input component inside the same frame. (prompt row/frame composition complete; full frame-owned input engine still pending)
- [ ] Implement phase 4: keep existing command parser, queue logic, FSRS logic, import logic, and database format unchanged while the visual shell changes.
- [x] Implement phase 5: add a screen session abstraction that stores the active frame and routes clear/render through one boundary.
- [x] Implement phase 6: add an opt-in frame-owned prompt path behind `INT_FRAME_PROMPT=1`.
- [x] Implement phase 7: route result/help/study/drill outputs through `screenSession` so frame prompts reuse the latest visible screen.
- [x] Implement phase 8: make frame prompt the default TTY path with `INT_FRAME_PROMPT=0` as a classic fallback.
- [x] Verify phase 1: add prompt-token regression coverage while keeping existing prompt input, Korean text, Esc cancel, and flashcard review prompt tests passing.
- [x] Verify phase 1: run syntax checks, import check, smoke test, prompt tests, notice check, and package dry run.
- [x] Verify phase 2: add UI line-frame tests and run syntax checks, UI tests, prompt tests, smoke, notice check, package dry run, and a piped help/quit CLI check.
- [x] Verify phase 3 partial: centralize `space>`, `rate>`, and `result>` prompt labels in the TUI input renderer and keep prompt/UI/smoke/package checks passing.
- [x] Verify phase 5: add frame/session tests and run syntax checks, UI tests, prompt tests, smoke, notice check, package dry run, and a piped root navigation check.
- [x] Verify phase 3 frame row: add prompt frame composition tests and run syntax checks, prompt tests, UI tests, smoke, notice check, and package dry run.
- [x] Verify phase 6: add frame-owned prompt tests, keep default prompts passing, and verify smoke, notice check, package dry run, and piped CLI exit.
- [x] Verify phase 7: add screen session helper tests and verify default/opt-in output paths, prompt/UI tests, smoke, notice check, and package dry run.
- [x] Verify phase 8: add frame prompt mode tests and verify default/fallback non-TTY flows, prompt/UI tests, smoke, notice check, and package dry run.
- [x] Verify phase 9: add stronger automated prompt checks for Korean backspace, Esc cancel, and long input in a frame prompt.
- [x] Verify phase 10: install PTY automation and run real TTY prompt regressions locally.
- [x] Implement phase 11: document command frame spec and compose high-impact create command result/context frames.
- [x] Implement phase 12: compose list mutation, import, queue, review/drill frames and expand PTY flow coverage.
- [x] Implement phase 13: normalize review and drill frame transitions.
- [ ] Review: manually test Windows PowerShell/CMD behavior before considering this stable.
- [ ] Push: do not push to GitHub until the user explicitly says the app is stable enough.

## Command Frame Spec

- [x] Define the command-by-command frame contract before further renderer changes.
- [ ] Implement the frame contract in CLI output paths.
- [ ] Add PTY coverage for representative command frame flows.

### Global Frame Rules

- Every visible command result should be expressible as a `Frame` with `lines` and `meta`.
- The active frame must represent the latest visible screen before the next prompt is drawn.
- `result` messages should not leave stale active frames behind.
- Multi-step commands may show intermediate frames, but the final frame after the command must be deterministic.
- Prompt rendering may compose `currentFrame + prompt row`, but command logic must not know about prompt rendering.
- Domain modules may return data or line arrays; they should not directly own terminal behavior unless explicitly routed through `screenSession`.

### Home / Root Selection

- App start:
  - Frame kind: `start`
  - Content: intro, heatmap if width allows, root list or first-root message.
- `clear`:
  - Frame kind: `start`
  - Content: same as app start.
- `set root`:
  - First frame kind: `roots`
  - Content: root list.
  - Final frame kind: `context`
  - Content: selected root context.
- Home root number/title selection:
  - Final frame kind: `context`
  - Content: selected root context.

### Create Commands

- `new root`:
  - Follow-up prompt: `type>`.
  - Result frame kind: `result`
  - Content: created root count/message.
  - Final frame kind: `context`
  - Content: first created root context.
- `new branch`, `b`, `ㅠ`:
  - Follow-up prompt: `type>`.
  - Result frame kind: `result`
  - Content: created branch count/message.
  - Final frame kind: `context`
  - Content: unchanged parent context with new children listed.
- `new leaf`, `l`, `ㅣ`:
  - Same as branch, type `leaf`.
- `new note`, `n`, `ㅜ`:
  - Same as branch, type `note`.
- `basic`:
  - Follow-up prompts: `Q?`, `A?`.
  - Result frame kind: `result`
  - Content: created basic flash card.
  - Final frame kind: `context`
  - Content: current note context with flashcard listed.
- `cloze`:
  - Follow-up prompt: `clozing?`.
  - Optional result frame kind: `result` if text not found.
  - Result frame kind: `result`
  - Content: created cloze flash card.
  - Final frame kind: `context`
  - Content: current note context with flashcard listed.

### Import Commands

- `import web`:
  - Follow-up prompt: `type>`.
  - Intermediate result frame: importing message.
  - Success result frame: imported web/PDF details.
  - Fallback result frame: saved URL-only link and capture error.
  - Final frame kind: `context`
  - Content: unchanged branch context with imported item listed.
- `save link`:
  - Follow-up prompt: `type>`.
  - Result frame kind: `result`
  - Content: saved link.
  - Final frame kind: `context`
  - Content: unchanged branch context.
- `import pdf`:
  - External file picker or cancel.
  - Result frame kind: `result`
  - Content: imported/canceled/error.
  - Final frame kind: `context`
  - Content: unchanged branch context.

### Navigation / Utility

- `help`:
  - Frame kind: `help`
  - Content: full help text.
- `where`:
  - Frame kind: `context`
  - Content: current context.
- `root` / `home`:
  - Frame kind: `context`
  - Content: current root context.
- `back`:
  - Frame kind: `context`
  - Content: parent context.
- `open`:
  - Result frame kind: `result`
  - Content: opened target or nothing openable.
- `set time`:
  - Follow-up prompt: `type>`.
  - Result frame kind: `result`
  - Content: new learning day boundary or invalid time.

### List Mutation

- `del ...`:
  - Result frame kind: `result`
  - Content: deleted/skipped counts.
  - Final frame kind: `context` or `roots`
  - Content: updated list.
- `sort ...`:
  - Result frame kind: `result`
  - Content: sorted or error.
  - Final frame kind: `context` or `roots`
  - Content: updated list.

### Queue

- `que`:
  - Empty result frame if no queue.
  - Otherwise frame kind: `queue-item`
  - Content: progress line plus current item context or hidden flashcard review state.
- `]` / `next`:
  - If in root queue: frame kind `queue-item`, updated progress/context.
  - If in local list queue: frame kind `queue-item`, selected child preview.
- `[` / `prev` / `previous`:
  - Same as next, reverse cursor.
- `d`:
  - Non-flashcard only.
  - Result frame kind: `result`
  - Content: done message.
  - Final frame kind: `queue-item` or `context`
  - Content: next queue item or updated context.
- `pass` / `fail`:
  - Result frame kind: `result`
  - Content: reviewed status.

### Flashcard Review / Drill

- Queue flashcard hidden:
  - Frame kind: `study-flashcard`
  - Content: masked card plus `Press Space to reveal.`
- Queue flashcard revealed:
  - Frame kind: `study-flashcard`
  - Content: revealed card plus `Rate: 1 Again | 2 Hard | 3 Good | 4 Easy`.
- Drill progress:
  - Frame kind: `drill-progress`
  - Content: round/index line.
- Drill hidden/revealed:
  - Frame kind: `study-flashcard`
  - Mode meta: `drill`.
  - Revealed content uses `Result: 1 Pass | 2 Fail`.
- Drill result/status:
  - Frame kind: `result`
  - Content: paused, starting next round, or all clear.

## Proposed Architecture

- `src/tui/renderer.mjs`: frame rendering, viewport size, clear/redraw, resize handling.
- `src/tui/input.mjs`: controlled single-line input, cursor movement, backspace/delete, submit, cancel.
- `src/tui/layout.mjs`: pure layout functions for intro, heatmap, root list, item header, stats, list rows, queue progress, flashcard reveal/rate states.
- `src/tui/theme.mjs`: colors and style tokens, including prompt-line background.
- `src/tui/session.mjs`: current screen state and render scheduling.
- Existing modules keep ownership of domain behavior: commands, queue, FSRS, imports, storage, and formatting primitives.

## Implementation Notes

- Prefer a Node TUI stack over handwritten ANSI patches. Evaluate `ink` first because Gemini CLI uses an Ink-style React TUI approach, while Codex's Rust `ratatui` approach would require a much larger rewrite.
- Keep a compatibility boundary: command handling should receive the same submitted strings it receives today.
- Preserve all current prompt text and command aliases.
- The prompt background should be a renderer-owned row, not a string emitted before readline.
- Resize should trigger a full frame recalculation rather than relying on terminal scrollback state.
- If the migration grows too risky, pause after phase 1 with both renderers coexisting behind a feature flag.

## Risk Checks

- Korean text width and composition must not leave stale glyphs after backspace.
- Long input must wrap or scroll deterministically without pushing old prompt artifacts into the screen.
- Flashcard review keys must not leak typed grades into the next prompt.
- Heatmap must remain optional or responsive enough not to corrupt narrow terminals.
- Non-TTY fallback must still work for smoke tests and simple piped commands.

## Phase 1 Review

- Added `src/tui/theme.mjs`, `src/tui/layout.mjs`, `src/tui/renderer.mjs`, and `src/tui/input.mjs`.
- Moved prompt token styling into the TUI layer.
- Restored the visible prompt background only on the `int>` token, not across the whole terminal row.
- Removed the old full-row background calculation from `ui.mjs` so terminal resize cannot leave a painted block behind through that path.
- Kept command parser, queue, FSRS, storage, import, and data formats unchanged.
- Verification passed:
  - `node --check src\tui\theme.mjs`
  - `node --check src\tui\layout.mjs`
  - `node --check src\tui\renderer.mjs`
  - `node --check src\tui\input.mjs`
  - `node --check src\input.mjs`
  - `node --check src\ui.mjs`
  - `node --check src\cli.mjs`
  - dynamic import check for `src/ui.mjs`
  - `npm run test:prompt`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`

## Phase 2 Review

- Added line-frame renderers for help, intro, start view, root list, context, flashcard, study flashcard, and queue progress.
- Kept the public `print*` functions as wrappers, but routed them through `src/tui/renderer.mjs`.
- Updated `cli.mjs` gap rendering to print precomputed lines instead of nesting direct `console.log` calls.
- Added `npm run test:ui`.
- Added UI regression tests for root/start/context frames and done-row rendering.
- Verification passed:
  - `node --check src\ui.mjs`
  - `node --check src\cli.mjs`
  - `node --check tests\ui.test.mjs`
  - `npm run test:ui`
  - `npm run test:prompt`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`
  - piped `help` then `q` through `node .\src\cli.mjs`

## Phase 3 Partial Review

- Routed `space>`, `rate>`, and `result>` label rendering through `src/tui/input.mjs`.
- Kept the currently stable Inquirer prompt state machine instead of reintroducing a custom raw-mode input loop.
- Added regression coverage for centralized review prompt labels.
- Remaining work: make the input row fully frame-owned when the renderer is ready to redraw a complete screen.
- Verification passed:
  - `node --check src\tui\input.mjs`
  - `node --check src\input.mjs`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`

## Phase 3 Frame Row Review

- Added `promptRow`, `promptFrame`, and `promptContent` to `src/tui/input.mjs`.
- Made all prompt labels use the same token renderer, including `int>`, `type>`, `Q?`, `A?`, `clozing?`, `space>`, `rate>`, and `result>`.
- Kept the prompt background scoped to the prompt token only, not the full terminal row.
- Added regression coverage for composing a prompt row into an existing frame while preserving frame metadata.
- Kept Inquirer as the actual input engine to avoid reintroducing raw-mode IME/backspace instability.
- Remaining work: a true frame-owned input engine that can redraw the whole active frame without duplicating scrollback.
- Verification passed:
  - `node --check src\tui\input.mjs`
  - `node --check src\input.mjs`
  - `node --check tests\prompt.test.mjs`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`

## Phase 5 Review

- Added `src/tui/session.mjs`.
- Added frame helpers in `src/tui/renderer.mjs`: `createFrame`, `blockFrame`, `resultFrame`, and `renderFrame`.
- Routed initial start rendering and clear/start re-rendering through `screenSession`.
- Routed context/root/queue-progress gap rendering through frame metadata.
- Kept existing command parsing, queue behavior, FSRS behavior, import behavior, and database shape unchanged.
- Added tests for frame metadata and active-frame tracking.
- Verification passed:
  - `node --check src\tui\renderer.mjs`
  - `node --check src\tui\session.mjs`
  - `node --check src\cli.mjs`
  - `node --check tests\ui.test.mjs`
  - `npm run test:ui`
  - `npm run test:prompt`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`
  - piped root navigation through `node .\src\cli.mjs`

## Phase 6 Review

- Added an opt-in frame-owned command/value prompt path behind `INT_FRAME_PROMPT=1`.
- When enabled in TTY mode, the prompt renderer can compose the active screen frame and the prompt row into one Inquirer render payload.
- The default path remains unchanged so the app keeps the stable Inquirer input behavior while the new path is tested.
- Added regression coverage for an `exactLinePrompt` rendered inside a base frame.
- Verification passed:
  - `node --check src\input.mjs`
  - `node --check tests\prompt.test.mjs`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - piped `q` through `node .\src\cli.mjs` with `INT_FRAME_PROMPT=1` to confirm non-TTY fallback still exits
  - `npm run check:notices`
  - `npm pack --dry-run`

## Phase 7 Review

- Added `renderLines`, `renderBlock`, and `renderResult` convenience methods to `screenSession`.
- Routed CLI result output through `screenSession.renderResult`.
- Routed `help`, study flashcard display, root selection lists, queue movement displays, and queue context displays through `screenSession`.
- Routed drill progress and drill status messages through `screenSession`.
- This prevents opt-in frame prompts from reusing stale frames after help/result/drill output.
- Verification passed:
  - `node --check src\tui\session.mjs`
  - `node --check src\ui.mjs`
  - `node --check src\cli.mjs`
  - `node --check src\drill.mjs`
  - `node --check tests\ui.test.mjs`
  - `npm run test:ui`
  - `npm run test:prompt`
  - `npm run smoke`
  - piped `help/q` with `INT_FRAME_PROMPT=1`
  - piped root navigation with `INT_FRAME_PROMPT=1`
  - `npm run check:notices`
  - `npm pack --dry-run`

## Phase 8 Review

- Made the frame prompt path the default for TTY prompts when an active frame exists.
- Added fallback values for the classic prompt path: `INT_FRAME_PROMPT=0`, `false`, `off`, or `classic`.
- Exported and tested `shouldUseFramePrompt`.
- Non-TTY behavior remains unchanged.
- Remaining manual check before calling this stable: run a real PowerShell/CMD TTY session and test Korean input/backspace, long wrapped input, Esc cancel, and terminal resize.
- Verification passed:
  - `node --check src\input.mjs`
  - `node --check tests\prompt.test.mjs`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - piped `help/q` with default prompt mode
  - piped root navigation with `INT_FRAME_PROMPT=0`
  - `npm run check:notices`
  - `npm pack --dry-run`

## Phase 9 Review

- Corrected the verification approach: do not hand TTY validation back to the user before running the strongest local checks available.
- Added frame prompt regression tests for:
  - Korean text input followed by Backspace and continued typing.
  - Esc cancel while text is present.
  - Long input rendered inside an active frame.
- Confirmed no stale submitted text in the tested Korean backspace path.
- Current tooling limit: this environment does not have a ConPTY automation library such as `node-pty`, so these tests validate the Inquirer prompt layer but not a live Windows Terminal resize event.
- Verification passed:
  - `node --check tests\prompt.test.mjs`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - piped `help/q`
  - `npm run check:notices`
  - `npm pack --dry-run`

## Phase 10 Review

- Installed `node-pty` as a dev dependency for real Windows PTY/ConPTY regression coverage.
- Added `npm run test:pty`.
- Added `tests/pty.test.mjs`, which launches the CLI in a PTY with an isolated `INT_DB_FILE`.
- The PTY test covers:
  - Creating a Korean root.
  - Korean text input, Backspace, and continued input saving as `한자`.
  - Long wrapped input saving and rendering in the list.
  - Escape cancel from `type>`.
  - Terminal resize followed by `help`.
- The first PTY run exposed a real issue: relying on `rl.line` did not preserve Korean Backspace behavior in the PTY path.
- Fixed prompt input by maintaining an internal Unicode-aware input buffer and syncing `rl.line`/`rl.cursor`.
- Added `node-pty` to `THIRD_PARTY_NOTICES.md`; notice check now covers 3 runtime and 2 dev dependencies.
- Known test-run noise: `node-pty` emits an `AttachConsole failed` stderr message from its internal `conpty_console_list_agent` on this machine, but the Node test exits successfully with the PTY assertion passing.
- Verification passed:
  - `node --check tests\pty.test.mjs`
  - `npm run test:pty`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`

## Phase 11 Review

- Added a command-by-command frame contract covering start/root selection, create commands, imports, navigation, list mutation, queue, review, and drill.
- Added `printCommandContext`, which composes command result messages and final context lines into one `command-context` frame.
- Refactored high-impact create flows to return messages instead of rendering loose result frames:
  - `new root`
  - `new branch`
  - `new leaf`
  - `new note`
  - `basic`
  - `cloze`
- Updated command handling so create results and final context render as one composed frame.
- Expanded the PTY test to assert `Created note: 한자` and the resulting `[note] 한자` list entry appear in the same command flow.
- Verification passed:
  - `node --check src\cli.mjs`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run test:pty`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`

## Phase 12 Review

- Refactored list mutation flows into composed command frames:
  - `del ...`
  - root-list `del ...`
  - `sort ...`
  - root-list `sort ...`
- Refactored import flows so success/failure messages and final branch context render as composed command frames:
  - `save link`
  - `import web`
  - `import pdf`
- Refactored root queue item display so progress and context render in one `queue-item` frame.
- Refactored queue flashcard review frames so queue progress is included in hidden/revealed study frames.
- Refactored root queue `d` so `Done: ...` and the next queue item render in one queue frame.
- Expanded PTY flow coverage for:
  - `save link`
  - `sort`
  - `del`
  - `que`
  - queue `d`
  - first prompt readiness before input injection
- Verification passed:
  - `node --check src\cli.mjs`
  - `node --check tests\pty.test.mjs`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run test:pty`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`

## Phase 13 Review

- Refactored queue flashcard review so `Reviewed: <grade>` and the next queue item render as one queue frame.
- Added shared queue study frame construction so hidden/revealed flashcard states can include progress consistently.
- Refactored drill card display so drill progress and hidden/revealed card content render as one `drill-card` frame.
- Expanded PTY coverage for:
  - entering a note,
  - creating a basic flashcard,
  - queue hidden/revealed flashcard review,
  - queue review advancing to the next item with `Reviewed: 4`,
  - drill hidden/revealed card display,
  - drill pass/all-clear result.
- Verification passed:
  - `node --check src\drill.mjs`
  - `node --check src\cli.mjs`
  - `node --check tests\pty.test.mjs`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run test:pty`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`

# Phase 14 Plan - Verify `d` Done Targeting

- [x] Trace `d` command handling in normal context and queue context.
- [x] Confirm whether `d` targets the current focused item or a first child/list row by mistake.
- [x] Reproduce with an isolated DB containing a parent item and child list.
- [x] Patch the minimal target-resolution logic if the bug is real.
- [x] Add or update regression coverage so `d` cannot mark the wrong item.
- [x] Run focused and full verification before reporting.

## Phase 14 Review

- Confirmed the user's suspicion was real: outside root queue mode, `d` used `selectedQueueItem(db, rootId, contextId)`, so it marked the first child/list row of the current item instead of the current focused item.
- Added `excludeCurrentContextItem` so normal-context `d` marks the current item only.
- Kept root-queue `d` behavior separate so queue-mode still marks the currently displayed queue item and advances.
- Added a PTY regression where a branch with a saved web child is marked done; the child remains visible and is not marked/deleted.
- Improved the final queue-done message so the last done action also reports `Root queue is empty.`.
- Verification passed:
  - `node --check src\cli.mjs`
  - `node --check tests\pty.test.mjs`
  - `npm run test:pty`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - `npm run check:notices`

# Phase 15 Plan - Reset Done Items

- [x] Define `reset` target semantics to mirror normal-context `d`: current focused item only.
- [x] Keep root and flashcards out of done/reset semantics.
- [x] Reinclude reset items in root queue by clearing `excluded` and `excludedAt`.
- [x] Update help text with the new command.
- [x] Add PTY regression covering `d` then `reset` on the same item.
- [x] Verify prompt, UI, PTY, smoke, and notice checks.

## Phase 15 Review

- Added `reset` command for the current focused item.
- `reset` clears `excluded` and `excludedAt`, so the item becomes eligible for root queue again.
- Root and flashcards remain outside done/reset semantics.
- Updated help with `reset`.
- Expanded the PTY regression to cover `d` followed by `reset` on a branch with a child web item, then verified the restored branch reappears in root queue counts.
- Verification passed:
  - `node --check src\cli.mjs`
  - `node --check src\ui.mjs`
  - `node --check tests\pty.test.mjs`
  - `npm run test:pty`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`

# Phase 16 Plan - Edit Command UX Decision

- [x] Confirm which item fields need editing for each item type.
- [x] Check established CLI approaches for editing existing long text.
- [x] Compare inline prompt editing, external terminal editor, and GUI/system editor options.
- [x] Choose the least fragile default UX before implementation.
- [x] After user confirms the direction, implement `edit` and `edit n`.

# Phase 17 Plan - System Window Edit Command

- [x] Add an app-owned Save/Cancel edit window helper.
- [x] Use an OS-aware launcher so Windows and macOS open the same controlled local edit window flow.
- [x] Add `edit` for the current focused item.
- [x] Add `edit n` for the nth visible list child of the current item.
- [x] Keep root/branch/leaf/note/web/pdf edits simple and deterministic.
- [x] Handle unsupported flashcard edits with a clear message for now.
- [x] Update help text.
- [x] Add automated coverage for target resolution and edit application without launching a real GUI.
- [x] Run verification gates.

## Phase 17 Review

- Corrected the edit UX direction after user feedback: no Notepad/TextEdit delegation.
- Added `src/editWindow.mjs`, an app-owned local Save/Cancel edit window opened through the OS default browser/window launcher.
- Added OS-aware launch handling: Windows uses `cmd /c start`, macOS uses `open`, Linux uses `xdg-open`.
- Added `src/edit.mjs` for pure edit target resolution and field application.
- Added `edit` for current focused item and `edit n` for visible child item n.
- Supported simple edits for root/branch/leaf/note/web/pdf; generic flashcard edit is intentionally blocked for now.
- Notes update both `title` and `body`.
- Updated help text and package scripts with `test:edit`.
- Added tests for target resolution, edit field application, edit page structure, and Save/Cancel server behavior without launching a real GUI.
- Verification passed:
  - `node --check src\edit.mjs`
  - `node --check src\editWindow.mjs`
  - `node --check src\cli.mjs`
  - `node --check tests\edit.test.mjs`
  - `npm run test:edit`
  - `npm run test:pty`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`

# Phase 18 Plan - Restore Frame After Unknown Command

- [x] Treat unknown-command output as a transient frame.
- [x] Preserve the previous active frame before rendering the unknown-command message.
- [x] On the next blank Enter, restore the preserved frame.
- [x] Keep normal blank Enter behavior unchanged in all other states.
- [x] Add regression coverage and run verification.

## Phase 18 Review

- Added transient-frame restore state for unknown commands.
- Unknown command now preserves the active frame before rendering `Unknown command. Type help.`
- The next blank Enter restores that preserved frame.
- Any nonblank command clears the pending restore state.
- Added PTY coverage for unknown command followed by blank Enter restoring the prior context frame.
- Verification passed:
  - `node --check src\cli.mjs`
  - `node --check tests\pty.test.mjs`
  - `npm run test:pty`
  - `npm run test:edit`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - `npm run check:notices`

# Phase 19 Plan - Standalone Edit Window

- [x] Replace normal browser-tab launching with an app-like standalone edit window.
- [x] Prefer existing Playwright/Chromium dependency to avoid adding pywebview/Electron weight.
- [x] Keep Save/Cancel server contract unchanged.
- [x] Add tests for app-window launcher selection without opening a real window.
- [x] Run edit and core verification gates.

## Phase 19 Review

- Replaced OS default browser tab launch with Playwright Chromium app-window launch.
- The edit UI still uses the same app-owned Save/Cancel page and local server contract.
- No new GUI dependency was added; the implementation reuses the existing Playwright dependency.
- Added a regression asserting the default launcher is app-window based.
- Verification passed:
  - `node --check src\editWindow.mjs`
  - `node --check tests\edit.test.mjs`
  - `npm run test:edit`
  - `npm run test:pty`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`

# Phase 20 Plan - Fix Edit Window Not Appearing

- [x] Reproduce the Playwright app-window launch outside the CLI.
- [x] Determine whether the CLI is blocked on launch, the browser executable is missing, or the window is hidden.
- [x] Add a launch path that visibly opens and returns errors to the CLI instead of hanging silently.
- [x] Add regression coverage for launcher failure/fallback behavior.
- [x] Run focused verification and report the exact behavior.

## Phase 20 Review

- Confirmed the first Playwright API launch path could create Chromium processes with `--no-startup-window`, leaving the CLI waiting while no edit window was visible.
- Replaced that path with direct Chromium executable launching via Playwright's installed executable path.
- On Windows, the launcher now uses `cmd /c start` with the explicit Playwright Chromium executable and `--app=<url>` so the window opens as a visible app window instead of a normal browser tab.
- Kept the Save/Cancel local server contract unchanged.
- Verified a direct app-window launch command opens and returns.
- Verification passed:
  - `node --check src\editWindow.mjs`
  - `npm run test:edit`
  - `npm run test:pty`
  - `npm run smoke`

# Phase 21 Plan - Remove Chrome For Testing Banner

- [x] Avoid Playwright's Chrome for Testing binary as the first Windows edit-window choice.
- [x] Prefer installed Chrome or Edge app mode to remove the testing-channel banner.
- [x] Keep Playwright Chromium as fallback when no installed browser is available.
- [x] Add launcher-selection coverage.
- [x] Run focused verification.

## Phase 21 Review

- Windows edit windows now prefer installed Google Chrome, then Edge, before falling back to Playwright's Chrome for Testing binary.
- This avoids the Chrome for Testing banner shown at the top of the edit window.
- Verified the selected browser path is `C:\Program Files\Google\Chrome\Application\chrome.exe` on this machine.
- Added test coverage for app browser executable selection.
- Verification passed:
  - `node --check src\editWindow.mjs`
  - `npm run test:edit`
  - direct edit window launcher smoke
  - `npm run test:pty`
  - `npm run smoke`

# Phase 22 Plan - Flashcard Edit Support

- [x] Add generic edit support for basic flashcards with `Q:` and `A:` fields.
- [x] Add cloze edit support using user-authored `{{c1::text}}` markup.
- [x] Parse edited basic text back into question/answer fields.
- [x] Parse edited cloze text back into `maskedText` and `clozeText`.
- [x] Keep FSRS scheduling/review state untouched during content edits.
- [x] Add tests for basic/cloze edit round trips.
- [x] Run focused and core verification.

## Phase 22 Review

- Basic flashcards now open in edit as:
  - `Q: ...`
  - `A: ...`
- Saving a basic edit parses the text back into `question` and `answer`.
- Cloze flashcards now open with explicit `{{c1::text}}` markup reconstructed from `maskedText` and `clozeText`.
- Saving a cloze edit requires a `{{c1::...}}` marker and stores:
  - `clozeText` as the marker content
  - `maskedText` with that marker replaced by `{{c1::...}}`
- FSRS state is untouched during content edits.
- Added edit tests for basic and cloze flashcard round trips.
- Verification passed:
  - `node --check src\edit.mjs`
  - `node --check src\cli.mjs`
  - `node --check tests\edit.test.mjs`
  - `npm run test:edit`
  - `npm run test:pty`
  - `npm run test:prompt`
  - `npm run test:ui`
  - `npm run smoke`
  - `npm run check:notices`
  - `npm pack --dry-run`

# Phase 23 Plan - Help Frame Flow Check

- [x] Pause push and inspect help frame behavior before/after `help`.
- [x] Confirm whether `help` should behave as a transient frame like unknown-command output.
- [x] Reproduce with PTY or focused frame tests.
- [x] Patch help restore behavior if the current flow breaks the frame model.
- [ ] Run verification and restage updated files.

## Phase 23 Review

- Confirmed `help` was replacing the active frame without a restore path, unlike unknown-command transient output.
- Made `help` preserve the previous active frame before rendering.
- Blank Enter after `help` now restores the previous frame, matching unknown-command behavior.
- Updated help/README wording from unknown-only restore to help/unknown restore.
- Updated PTY coverage so `help` followed by blank Enter restores the prior context frame.
