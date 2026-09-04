# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Astro Starlight documentation site for the **did:btcr2** DID Method (Bitcoin Reference 2.0), a censorship-resistant DID method anchored to the Bitcoin blockchain. Deployed to `btcr2.dev`.

## Commands

Package manager: **pnpm 10.16.1** (declared in `packageManager`). Use `pnpm`, not `npm` or `yarn`.

- `pnpm dev`: Astro dev server
- `pnpm build`: Production build (output goes to `dist/`)
- `pnpm typecheck`: `astro check` (also validates the TS example snippets in `src/examples/`)
- `pnpm preview`: Serve the build locally
- `pnpm clean`: Wipe `node_modules`, lockfile, `.astro`, and `dist`

Run `pnpm typecheck && pnpm build` before committing. No lockfile is committed (`.gitignore`d by design), so installs float on latest matching versions.

## Architecture

### Content lives in `src/content/docs/`
- Pages: `index.mdx` (splash home), `spec.md`, `demo.mdx`, `diagrams.md`, `parity.md`, `impls.md`, and `impls/{java,py,rs}.md` + `impls/ts.mdx`.
- Starlight requires a `title` in every page's frontmatter; do not add an H1 in the body.
- `.mdx` pages import components explicitly; `.md` pages are plain markdown. MDX does NOT support `<https://url>` autolinks; use `[text](url)`.
- TS example snippets live in `src/examples/ts/` and are embedded in `impls/ts.mdx` via `?raw` imports + Starlight's `<Code>` component. They are typechecked by `astro check`, so they must be self-contained.
- Nav/sidebar/theme config: `astro.config.mjs` (Starlight `sidebar`, `social`, `customCss`).

### Interactive demos (Vue islands)
Vue 3 demo components live in `src/theme/` (`components/`, `demos/`, `composables/`) and are mounted in `demo.mdx` as islands with `client:only="vue"`; they never render during SSR. `composables/useDidBtcr2.ts` dynamically imports `@did-btcr2/api`, `@did-btcr2/keypair`, and `@did-btcr2/common` once per page and exposes `createApiForNetwork()`. The packages are pure JS (no WASM). Keep new `@did-btcr2/*` usage behind the composable.

The components still use `--vp-c-*` CSS variables from their VitePress origin; `src/styles/custom.css` aliases those to Starlight's `--sl-color-*` palette. Don't remove the alias block.

### Mermaid diagrams
```` ```mermaid ```` fences render client-side via the `astro-mermaid` integration (registered BEFORE `starlight` in `astro.config.mjs`; order matters). Theme switching is automatic. Diagram sources live inline in the markdown pages; standalone OKR sources are kept in `public/diagrams/okrs/`.

### Bitcoin REST endpoints (same-origin /mempool proxy is REQUIRED)
mempool.space networks (`bitcoin`, `testnet3`, `testnet4`, `signet`) are routed through the site's **same-origin `/mempool` path** via `createApiForNetwork()` in `src/theme/composables/useDidBtcr2.ts`:
- Dev: the `vite.server.proxy` block in `astro.config.mjs`.
- Prod: the VM's nginx `location /mempool/ { proxy_pass https://mempool.space/; }` block (added via helpdesk issue #25; not in this repo).

Direct browser calls to mempool.space FAIL: `@did-btcr2/bitcoin`'s REST client sends `Content-Type: application/json` on GETs, making them non-simple requests, and mempool.space's OPTIONS handler 404s the resulting preflight. Do not "simplify" this back to direct calls unless the upstream client stops sending that header. `mutinynet.com` handles preflight correctly and stays direct; `regtest` uses the library's localhost default. There is no `fetch` monkey-patching and no env-var config; the `@did-btcr2` packages take explicit config objects only (`createApi({ btc: { network, rest, rpc, executor } })`).

### Deployment
btcr2.dev is served from a company VM with **no automation**. Release flow: bump `Version:` in `rpm/btcr2-dev.spec` (+ changelog) and `package.json`, push to the GitLab upstream (`gl1.dcdpr.com:website/btcr2-dev.git`), tag `vX.Y.Z`, then file an issue on the internal helpdesk GitLab; third-party IT clones the GitLab repo at the tag, builds an RPM (`rpmbuild -ta`, spec runs `npm install && npm run build` and installs `dist/*` to `/var/www/btcr2-dev`), and installs it. nginx serves the site and must keep the `/mempool` proxy block. The GitHub Actions workflow in `.github/workflows/ci.yml` only verifies typecheck+build (weekly cron catches upstream `@did-btcr2` breakage, since no lockfile is committed); it does not deploy.

## Conventions

- License: **MPL-2.0**.
- Dependency versions track the `did-btcr2-js` monorepo (`@did-btcr2/api` / `keypair` / `common`); the api facade is pre-1.0 and moves fast. When bumping, re-run the demos against a test network.
- The spec itself is **not** in this repo. `src/content/docs/spec.md` only links to `https://dcdpr.github.io/did-btcr2`. Don't try to edit spec content here.
