# Workflow Package Guide

`packages/workflow` owns the local album automation logic for City Pop Chan:
Suno imports and downloads, album metadata, cover generation, Remotion video
rendering, YouTube publishing, and DistroKid package preparation.

## Ownership

Keep durable filesystem writes, generated album data, media processing, Remotion
composition code, YouTube upload behavior, and DistroKid package creation in
this package. `apps/web` may call this package from local Studio API routes, but
the business logic should remain here.

The Suno browser extension lives in `apps/suno-extension`. Browser-page capture
and popup behavior belong there. Convex provider integrations belong in
`packages/backend`.

## Skills

Workflow-local skills live in `packages/workflow/.agents/skills/<skill>/SKILL.md`.
Read only the narrow skill needed for the task.

| Skill                     | Invoke when                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `remotion-best-practices` | Remotion compositions, video rendering, audio/video timing, captions, transitions, fonts, or media APIs |

For Suno browser batch generation, read `apps/suno-extension/AGENTS.md` and use
the `suno` skill there. For nontrivial TypeScript modeling, explicit errors, or
Effect work, use the shared root skills after reading this file.

## Tools

Root scripts delegate to this package for workflow commands:

- `pnpm suno:download`
- `pnpm youtube:auth`
- `pnpm youtube:upload`
- `pnpm youtube:video`

Use package exports such as `@workspace/workflow/suno-download` and
`@workspace/workflow/youtube-video` instead of cross-package deep imports.
