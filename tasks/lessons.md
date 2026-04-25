# Lessons

- When terminal spacing bugs recur, avoid fixing individual call sites one by one. Route result-style output through a shared helper so command output has one blank line before and after consistently.
- When talking about test data, distinguish "local ignored workspace file" from "tracked/pushed repository file" explicitly before answering.
- Before validating global CLI behavior, check `where.exe <command>` and `npm list -g --depth=0` so the patched checkout matches the command the user actually runs.
- Web imports must not depend on `networkidle` alone. Dynamic pages can keep connections open, so use bounded waits and save a URL-only item when PDF capture fails.
- Import commands that attach resources under the current branch must leave the user in that branch; do not auto-enter the newly created resource item.
- Prompt rendering bugs around IME/backspace/Esc should be fixed at the prompt layer instead of adding more ANSI/raw-mode patches.
- Do not push Int changes to GitHub during the prompt/TUI stabilization period until the user explicitly says the app is stable enough.
- Do not hand manual TTY verification back to the user as the next step; build and run the strongest automated/local verification available first, then state any remaining tooling limits plainly.
- For one-key actions such as `d`, resolve the target from the user's current mode explicitly. Normal context actions should target the current item, while queue-mode actions should target the current queue item.
- When the user asks for a simple system edit window, do not substitute Notepad/TextEdit. Provide an app-owned Save/Cancel editing dialog or a clearly equivalent controlled flow.
- App-owned edit dialogs must not open as normal browser tabs with address bars. Prefer a standalone app-like window using existing project dependencies before adding a new GUI runtime.
- After changing a GUI launch path, verify that the window actually appears or that launch failure returns control to the CLI; tests that only mock the launcher are not enough.
