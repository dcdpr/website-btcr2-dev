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
- Pages: `index.mdx` (splash home), `spec.md`, `demo.mdx`, `diagrams.md`, `parity.md`, `impls.md`, `impls/{java,py,rs}.md`, and the TypeScript group `impls/ts/{index.mdx,sdk.mdx,cli.md}` (Overview, SDK, CLI).
- Starlight requires a `title` in every page's frontmatter; do not add an H1 in the body.
- `.mdx` pages import components explicitly; `.md` pages are plain markdown. MDX does NOT support `<https://url>` autolinks; use `[text](url)`.
- TS example snippets live in `src/examples/ts/` and are embedded in `impls/ts/sdk.mdx` via `?raw` imports + Starlight's `<Code>` component. They are typechecked by `astro check`, so they must be self-contained. They import only `@did-btcr2/api`. `astro check` does not typecheck `.vue` files.
- Nav/sidebar/theme config: `astro.config.mjs` (Starlight `sidebar`, `social`, `customCss`).

### Interactive demos (Vue islands)
Vue 3 demo components live in `src/theme/` (`components/`, `demos/`, `composables/`) and are mounted in `demo.mdx` as islands with `client:only="vue"`; they never render during SSR. `composables/useDidBtcr2.ts` dynamically imports `@did-btcr2/api` once per page (the api re-exports `SchnorrKeyPair`, `LocalSigner`, and the genesis helpers) and exposes `createApiForNetwork()` and `networkOf()`. The demos take the network from the DID, because the api refuses a DID on a connection for a different network. The packages are pure JS (no WASM). Keep new `@did-btcr2/*` usage behind the composable.

The components still use `--vp-c-*` CSS variables from their VitePress origin; `src/styles/custom.css` aliases those to Starlight's `--sl-color-*` palette. Don't remove the alias block.

### Mermaid diagrams
```` ```mermaid ```` fences render client-side via the `astro-mermaid` integration (registered BEFORE `starlight` in `astro.config.mjs`; order matters). Theme switching is automatic. Diagram sources live inline in the markdown pages; standalone OKR sources are kept in `public/diagrams/okrs/`.

### Bitcoin REST and CAS endpoints (CORS-safe executor is REQUIRED)
All networks use the library's default REST hosts (mempool.space, mutinynet.com, localhost for `regtest`). `createApiForNetwork()` in `src/theme/composables/useDidBtcr2.ts` passes a custom `executor` that removes `Content-Type` from GET requests.

The executor is necessary because `@did-btcr2/bitcoin`'s REST client sends `Content-Type: application/json` on every GET. That header makes the request non-simple. The browser then sends a CORS preflight, and the mempool.space OPTIONS handler answers 404. The executor also sets `cache: 'no-store'` and adds a unique query string to `/blocks/tip/height`. mutinynet.com sends `max-age=14400` on that path, and its Cloudflare cache can serve a tip one block old. With a stale tip, a new beacon signal gets no confirmations, and resolution ignores it. Do not remove the executor until the upstream client stops sending that header and bypasses the HTTP cache. The site has no `/mempool` proxy (Vite or nginx) since v2.1.0. There is no `fetch` monkey-patching and no env-var config; the `@did-btcr2` packages take explicit config objects only (`createApi({ btc: { network, rest, rpc, executor }, cas: { gateway } })`).

The composable also sets `cas.gateway` to `https://trustless-gateway.link`. The library default (`https://ipfs.io`) is in sunset, and its redirect has no CORS header, so browser CAS reads fail on it.

### Deployment
btcr2.dev is served from a company VM with **no automation**. Release flow: bump `Version:` in `rpm/btcr2-dev.spec` (+ changelog) and `package.json`, push to the GitLab upstream (`gl1.dcdpr.com:website/btcr2-dev.git`), tag `vX.Y.Z`, then file an issue on the internal helpdesk GitLab; third-party IT clones the GitLab repo at the tag, builds an RPM (`rpmbuild -ta`, spec runs `npm install && npm run build` and installs `dist/*` to `/var/www/btcr2-dev`), and installs it. nginx serves the site as static files. The GitHub Actions workflow in `.github/workflows/ci.yml` only verifies typecheck+build (weekly cron catches upstream `@did-btcr2` breakage, since no lockfile is committed); it does not deploy.

## Conventions

- License: **MPL-2.0**.
- The site depends on `@did-btcr2/api` only; it re-exports the keypair, signer, and genesis helpers. The api is 0.x and moves fast (a caret range pins the minor version). When bumping, re-run the demos against a test network, including a funded Update on mutinynet.
- The spec itself is **not** in this repo. `src/content/docs/spec.md` only links to `https://dcdpr.github.io/did-btcr2`. Don't try to edit spec content here.
