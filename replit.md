# GhostClient

A Discord client modification forked from BetterDiscord and fully rebranded as GhostClient. Enhances Discord with themes, plugins, and built-in tools.

## Project Overview

GhostClient is an Electron-based tool that injects modifications into the Discord desktop client. It ships with bundled plugins and themes, a built-in Embed Builder, and local addon management.

## Tech Stack

- **Runtime / Package Manager**: Bun (>=1.2)
- **Language**: TypeScript, TSX (React)
- **Bundler**: esbuild (via custom `scripts/build.ts`)
- **UI**: React (sourced from Discord's internal Webpack modules)
- **Editor**: Monaco Editor embedded in Electron

## Project Structure

- `src/betterdiscord/` — Core GhostClient logic (API, builtins, modules, UI, webpack)
- `src/betterdiscord/bundled/` — Bundled plugins (`plugins.ts`) and themes (`themes.ts`) shipped with GhostClient
- `src/betterdiscord/ui/settings/embedbuilder.tsx` — Embed Builder panel (discohook.org integration)
- `src/electron/` — Electron main and preload process code
- `src/editor/` — Standalone code editor (CSS/Plugin editor)
- `src/common/` — Shared utilities and constants
- `assets/locales/` — Localization files
- `scripts/` — Build, injection, and packaging scripts
- `dist/` — Build output directory (generated)

## GhostClient Features

### Branding
- All "BetterDiscord" references renamed to "GhostClient" in UI, protocols, logs, and settings
- Data folder changed from `BetterDiscord/` to `GhostClient/` on disk
- Protocol changed from `betterdiscord://` to `ghostclient://`
- Logger prefix changed to `[GhostClient]`

### Bundled Plugins (auto-installed to plugins folder on first startup)
- **GhostCopyRaw** — Adds "Copy Raw" to message context menus
- **GhostHideStreamUI** — Hides the streaming overlay toolbar
- **GhostImageExpander** — Click images to expand them fullscreen
- **GhostMentionHighlight** — Highlights your mentions with purple glow
- **GhostCustomStatus** — Shows a "GC" badge next to your name in the sidebar

### Bundled Themes (auto-installed to themes folder on first startup)
- **GhostDark** — Ultra-dark minimal theme with purple accents
- **GhostNeon** — Vibrant neon-purple cyberpunk theme
- **GhostMidnight** — Calm midnight-blue dark theme

### Embed Builder
- New "Embed Builder" panel in GhostClient settings (powered by discohook.org)
- Opens the full embed builder inline within Discord
- Lets users craft Discord embeds visually

## Build Output

Running `bun run build` produces:
- `dist/betterdiscord.js` — Main Discord modification bundle (includes all bundled addons)
- `dist/main.js` — Electron main process
- `dist/preload.js` — Electron preload script
- `dist/editor/` — Standalone code editor

## Available Scripts

- `bun run build` — Development build (all modules)
- `bun run watch` — Development build with file watching
- `bun run build:production` — Production/minified build
- `bun run dist` — Production build + packaging
- `bun run test` — Run tests with Bun test runner
- `bun run lint` — ESLint

## Workflow

The "Start application" workflow runs `bun run build` to build all modules. This is a one-shot build command, not a persistent server.

## Notes

- This project targets Electron (Chrome 128, Node 20)
- React is aliased to Discord's internal `@modules/react` (not bundled)
- Path aliases are defined in `tsconfig.json` (e.g., `@api/*`, `@ui/*`, `@webpack`, `@bundled/*`)
- Bundled addons are written to the user's GhostClient folder only if they don't already exist
