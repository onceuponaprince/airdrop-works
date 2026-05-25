# Agent Instructions: airdrop-works

This file scopes AI-agent behavior for this project. It extends the global workspace guidance at /home/onceuponaprince/AGENTS.md.

## Precedence

Use this order inside this project:

1. Current user request.
2. This project's guidance files.
3. Existing project-scoped CLAUDE.md, .cursorrules, or tool-specific rules.
4. Parent workspace guidance.
5. Tool defaults.

If this file conflicts with a more specific nested guidance file, the nested file wins for that subtree.

## Project Profile

- Project: airdrop-works.
- Detected stack:  JavaScript/TypeScript.
- Default package manager: project package manager unless existing project docs say otherwise.

## Working Rules

- Keep changes scoped to this project unless the user explicitly asks for cross-project edits.
- Preserve existing structure, commands, naming, and framework choices.
- Do not copy proprietary code or product patterns from sibling projects without naming the source and getting confirmation.
- Treat existing CLAUDE.md content as project-specific context, not generic global policy.
- Do not edit vendored, generated, dependency, build, or cache directories unless explicitly requested.

## Validation

- Do not run tests, builds, formatters, migrations, or package installs unless requested.
- If validation is requested, prefer the narrowest command that covers the changed area.
- If no project-specific command is documented, infer from lockfiles and config files before running anything.
