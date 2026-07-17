# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

VitePress documentation site for the **did:btcr2** DID Method (Bitcoin Reference 2.0), a censorship-resistant DID method anchored to the Bitcoin blockchain. Deployed to `btcr2.dev`.

## Commands

Package manager: **pnpm 10.16.1** (declared in `packageManager`). Use `pnpm`, not `npm` or `yarn`.

- `pnpm dev`: VitePress dev server (`vitepress dev docs`)
- `pnpm build`: Production build (`vitepress build docs`, output goes to `docs/.vitepress/dist`)
- `pnpm typecheck`: `vue-tsc --noEmit` against `docs/.vitepress/tsconfig.json`
- `pnpm preview`: Serve build on port 8080
- `pnpm serve`: `vitepress serve docs`
- `pnpm clean`: Wipe `node_modules`, lockfile, and VitePress cache/dist

There is no test or lint script. Run `pnpm typecheck && pnpm build` before committing theme/demo changes.

## Architecture

### Content lives in `docs/`
- Markdown pages: `docs/index.md` (home), `docs/spec.md`, `docs/demo.md`, `docs/diagrams.md`, `docs/impls.md`, `docs/parity.md`, plus per-language pages under `docs/impls/{java,py,rs,ts}.md`.
- TypeScript code snippets embedded in `docs/impls/ts.md` via `<<< @/examples/ts/*.ts` live in `docs/examples/ts/`.
- VitePress nav/sidebar/theme config: `docs/.vitepress/config.ts`.

### Custom theme + Vue demo components
`docs/.vitepress/theme/index.ts` extends the default VitePress theme and globally registers:
- `<DemoCreate />`, `<DemoResolve />`, `<DemoUpdate />` (also `<DemoUpdate op="deactivate" />`) from `theme/demos/`, used inline in `demo.md`.
- `<DemoCard>` (shared demo shell) and `<Mermaid>` from `theme/components/`.

`theme/composables/useDidBtcr2.ts` dynamically imports `@did-btcr2/api`, `@did-btcr2/keypair`, and `@did-btcr2/common` once per page and exposes `createApiForNetwork()`. The dynamic import keeps these packages out of VitePress SSR; the demos are strictly client-side. The packages are pure JS (no WASM), so no WASM/top-level-await Vite plugins are needed. Keep new `@did-btcr2/*` usage behind the composable.

### Mermaid diagrams
A markdown-it fence override in `config.ts` turns ```` ```mermaid ```` blocks into `<Mermaid code-b64="...">`; `Mermaid.vue` renders client-side in `onMounted` (theme-aware, re-renders on dark-mode toggle). There is no vitepress mermaid plugin; diagram sources live inline in the markdown pages.

### Bitcoin REST endpoints (CORS handling)
`useDidBtcr2.ts#createApiForNetwork` configures the api's Esplora REST host per network:
- **Dev**: routes through Vite dev-server proxies declared in `config.ts` (`/mempool` to `mempool.space`, `/mutinynet` to `mutinynet.com`) to avoid CORS.
- **Prod**: uses the library defaults (`mempool.space`, `mutinynet.com`) directly; `regtest` defaults to localhost.

There is no `fetch` monkey-patching and no env-var config; the `@did-btcr2` packages take explicit config objects only (`createApi({ btc: { network, rest, rpc, executor } })`).

### Vite resolve settings
`config.ts` sets `resolve.conditions: ['browser']` (so the `@did-btcr2/*` prebuilt browser bundles are picked up during SSR/build) and `resolve.dedupe: ['vue']`. Keep these when adding packages with Node-vs-browser conditional exports.

## Conventions

- License: **MPL-2.0**.
- Markdown pages can embed the registered Vue components directly as tags; no per-page imports needed.
- Dependency versions track the `did-btcr2-js` monorepo (`@did-btcr2/api` / `keypair` / `common`); when bumping, re-run the demos against a test network. The api facade is pre-1.0 and moves fast.
- The spec itself is **not** in this repo. `docs/spec.md` only links to `https://dcdpr.github.io/did-btcr2` (source: `github.com/dcdpr/did-btcr2`). Don't try to edit spec content here.
