# Lessons

- When terminal spacing bugs recur, avoid fixing individual call sites one by one. Route result-style output through a shared helper so command output has one blank line before and after consistently.
- When talking about test data, distinguish "local ignored workspace file" from "tracked/pushed repository file" explicitly before answering.
- Before validating global CLI behavior, check `where.exe <command>` and `npm list -g --depth=0` so the patched checkout matches the command the user actually runs.
- Web imports must not depend on `networkidle` alone. Dynamic pages can keep connections open, so use bounded waits and save a URL-only item when PDF capture fails.
- Import commands that attach resources under the current branch must leave the user in that branch; do not auto-enter the newly created resource item.
