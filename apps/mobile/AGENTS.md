# Mobile App Guide

`apps/mobile` is the Expo Router React Native application. It owns native
screens, navigation, native UI composition, Expo app workflows, and mobile
client integration with generated backend APIs.

## UI Boundaries

Compose screens from `apps/mobile/components/ui` first. The mobile app does not
import web React components from `packages/ui`; it mirrors the shared design
language with native primitives and generated theme values.

Do not hand-edit generated theme files:

- `apps/mobile/global.css`
- `apps/mobile/lib/theme.ts`

Change token sources in `packages/ui`, then run `pnpm sync:mobile-theme`.

## Skills

Mobile-local skills live in `apps/mobile/.agents/skills/<skill>/SKILL.md`. Read
only the narrow skill needed for the task.

| Skill                        | Invoke when                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `building-native-ui`         | Building Expo Router screens, native UI, navigation, styling, animations, tabs, search, forms, or media patterns |
| `vercel-react-native-skills` | React Native performance, lists, animations, images, native APIs, monorepo native deps, or platform UI patterns  |
| `react-native-reusables`     | React Native Reusables, shadcn-style native components, `@rn-primitives`, NativeWind setup, or copied UI code    |
| `native-data-fetching`       | Any network request, API call, data fetching, caching, offline behavior, React Query/SWR, or Expo Router loaders |
| `expo-tailwind-setup`        | Setting up or fixing Tailwind CSS, `react-native-css`, or NativeWind in Expo                                     |
| `Expo UI SwiftUI`            | Using `@expo/ui/swift-ui`, SwiftUI-backed views, native-feeling lists, menus, sheets, sliders, or pickers        |
| `expo-module`                | Creating or editing Expo native modules/views, config plugins, native module APIs, Swift/Kotlin, or autolinking  |
| `expo-dev-client`            | Building, installing, or distributing Expo development clients locally or through release channels               |
| `expo-deployment`            | EAS build/submit, production releases, app store rollout, versions/build numbers, or store metadata              |
| `eas-update-insights`        | EAS Update health, crash rates, installs/launches, payload size, OTA vs embedded users, or rollout gates         |
| `expo-api-routes`            | Expo Router API routes, EAS Hosting server routes, webhooks, server secrets, proxies, or server validation       |
| `upgrading-expo`             | Expo SDK upgrades, dependency fixes, new architecture, React Compiler, deprecated package migrations             |
| `use-dom`                    | Expo DOM components, web-only libraries in native, webview-backed React web code, HTML/CSS, canvas, or embeds    |

For cross-cutting TypeScript or Effect work, use the shared root skills in
`.agents/skills/` after reading this file.

## Tools

Use Expo and EAS tooling for mobile builds, updates, submissions, and device
workflows. Client apps consume generated backend APIs; provider setup, Convex
functions, auth, email, billing, and schema changes belong in
`packages/backend`.

Run mobile commands from this workspace unless the task is intentionally
repo-wide. The local typecheck command is `pnpm --filter mobile typecheck`.
