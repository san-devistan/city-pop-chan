# Suno Extension Guide

`apps/suno-extension` is the unpacked Chromium extension used by the City Pop
workflow. It owns the popup UI and browser-page capture logic for Suno, YouTube,
Pinterest, and DistroKid.

## Ownership

Keep browser-context scraping, active-tab detection, popup state, and extension
build behavior in this workspace. The extension should send data to the local
Studio app at `http://127.0.0.1:4177`; it should not own durable file writes,
album package generation, Remotion rendering, YouTube upload logic, or backend
provider integrations.

The local Studio app lives in `apps/web`. Workflow code for downloads, album
metadata, cover generation, DistroKid packages, and YouTube publishing lives in
`packages/workflow`.

## Skills

Extension-local skills live in `apps/suno-extension/.agents/skills/<skill>/SKILL.md`.
Read only the narrow skill needed for the task.

| Skill  | Invoke when                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| `suno` | Running the complete Suno City Pop browser batch flow, downloading verified clips, and trashing that batch |

For popup TypeScript changes, use the shared root TypeScript quality skill only
when the change needs domain modeling, error handling, or module-boundary
guidance.

## Tools

Use the in-app Browser skill for the `suno` workflow because it depends on
interactive Suno browser state. Do not ask for or store credentials, cookies,
OAuth codes, tokens, or payment data.

Build the extension with `pnpm suno:extension:build`.
