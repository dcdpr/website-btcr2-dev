# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

VitePress documentation site for the **did:btcr2** DID Method (Bitcoin Reference 2.0) — a censorship-resistant DID method anchored to the Bitcoin blockchain. Deployed to `btcr2.dev`.

## Commands

Package manager: **pnpm 10.16.1** (declared in `packageManager`). Use `pnpm`, not `npm` or `yarn`.

- `pnpm dev` — VitePress dev server (`vitepress dev docs`)
- `pnpm build` — Production build (`vitepress build docs`, output → `docs/.vitepress/dist`)
- `pnpm preview` — Serve build on port 8080
- `pnpm serve` — `vitepress serve docs`
- `pnpm clean` — Wipe `node_modules`, lockfile, and VitePress cache/dist

There is no test, lint, or typecheck script. `tsconfig.json` lives at `docs/.vitepress/tsconfig.json` and only covers VitePress-side TS; it is not wired to a CLI script.

## Architecture

### Content lives in `docs/`
- Markdown pages: `docs/index.md` (home), `docs/spec.md`, `docs/impls.md`, `docs/demo.md`, `docs/diagrams.md`, plus per-language pages under `docs/impls/{java,py,rs,ts}.md`.
- Static assets and Mermaid sources: `docs/public/`.
- VitePress nav/sidebar/theme config: `docs/.vitepress/config.ts`. The `Diagrams` entry is intentionally commented out in the nav and sidebar — leave it commented unless re-enabling that page.

### Custom theme + Vue demo components
`docs/.vitepress/theme/index.ts` extends the default VitePress theme and globally registers two Vue 3 components used inline in `demo.md`:
- `<DidBtcr2DemoCreate />` — interactive demo for `DidBtcr2.create()`
- `<DidBtcr2DemoResolve />` — interactive demo for `DidBtcr2.resolve()`

Both components live in `docs/.vitepress/theme/components/` and **dynamically `import("@did-btcr2/method")` inside `onMounted`**, not at module top level. This is deliberate — the package is browser-only and depends on WASM. Keep dynamic imports for any new code paths that touch `@did-btcr2/method`.

### WASM + browser-only resolution
`docs/.vitepress/config.ts` configures Vite with:
- `vite-plugin-wasm` and `vite-plugin-top-level-await` (required by `@did-btcr2/method`)
- `resolve.conditions: ['browser']` and `resolve.dedupe: ['vue']`

If you add another package that ships WASM or has Node-vs-browser conditional exports, those settings are why it works — don't remove them.

### Mempool proxy (CORS workaround)
There are **two coordinated pieces** that route mempool.space API calls through the dev server to avoid CORS:
1. `config.ts` declares a Vite dev proxy: `/mempool → https://mempool.space` (path stripped).
2. `theme/index.ts` monkey-patches `globalThis.fetch` so any URL matching `mempool.space` or `mempool.holdings` is rewritten to `/mempool/...` before hitting the network.

If you change one, change the other. This patch runs in production builds too — confirm the deployment serves `/mempool` or strip the patch for prod before changing hosts.

### Demo runtime config
`.env.local` (gitignored) holds `ACTIVE_NETWORK` and `BITCOIN_NETWORK_CONFIG` JSON consumed by the demo components / `@did-btcr2/method`. Supported networks per `demo.md`: `bitcoin`, `testnet3`, `testnet4`, `signet`, `mutinynet`, `regtest`.

## Conventions

- License: **MPL-2.0**.
- Markdown pages can embed the registered Vue components directly as tags — no per-page imports needed.
- The spec itself is **not** in this repo. `docs/spec.md` only links to `https://dcdpr.github.io/did-btcr2` (source: `github.com/dcdpr/did-btcr2`). Don't try to edit spec content here.
