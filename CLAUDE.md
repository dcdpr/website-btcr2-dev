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
- Pages: `index.mdx` (splash home), `spec.md`, `demo.mdx`, `diagrams/{index,create,resolve,update,beacons,data}.md`, the use case group `diagrams/use-case/{index,key-rotation,states,data}.mdx`, `parity.md`, `impls.md`, `impls/{java,py,rs}.md`, and the TypeScript group `impls/ts/{index.mdx,sdk.mdx,cli.mdx}` (Overview, SDK, CLI).
- Starlight requires a `title` in every page's frontmatter; do not add an H1 in the body.
- `.mdx` pages import components explicitly; `.md` pages are plain markdown. MDX does NOT support `<https://url>` autolinks; use `[text](url)`.
- TS example snippets live in `src/examples/ts/` and are embedded in `impls/ts/sdk.mdx` via `?raw` imports + Starlight's `<Code>` component. They are typechecked by `astro check`, so they must be self-contained. They import only `@did-btcr2/api`. `astro check` does not typecheck `.vue` files: run `pnpm dlx --package vue-tsc@3 --package typescript@5.9 vue-tsc --noEmit -p tsconfig.json` for them.
- Each TS example, Code Preview, and doc code block uses only the api facade. The only runtime import is `createApi`, and each call starts at the `api` object: its methods (`createDid`, `resolveDid`, `updateDid`, `deactivateDid`) and its sub-facades (`api.crypto`, `api.kms`, `api.did`, `api.btcr2`, `api.btc`, `api.cas`, `api.smt`). Type imports are allowed. A shown snippet must not use an undefined helper such as `hexToBytes`. If the facade has no path for a need, propose an upstream addition. Do not import a lower `@did-btcr2/*` package.
- Nav/sidebar/theme config: `astro.config.mjs` (Starlight `sidebar`, `social`, `customCss`).

### Interactive demos (Vue islands)
Vue 3 demo components live in `src/theme/` (`components/`, `demos/`, `composables/`) and are mounted in `demo.mdx` as islands with `client:only="vue"`; they never render during SSR. `composables/useDidBtcr2.ts` dynamically imports `@did-btcr2/api` once per page (the api exports only its facade, ADR 132) and exposes `createApiForNetwork()`, `getLocalApi()` (an api with no Bitcoin connection, for keys, identifiers, and documents), and `networkOf()`. The demos take the network from the DID, because the api refuses a DID on a connection for a different network. The packages are pure JS (no WASM). Keep new `@did-btcr2/*` usage behind the composable. Create, Update, and Deactivate accept only `TEST_NETWORKS` (no mainnet); Resolve is read-only and also accepts mainnet. The demo has no `regtest`, because it needs a local node: for a regtest DID, Resolve, Update, and Deactivate show "This demo does not support regtest". The other pages keep `regtest`, because they describe the method and the libraries. The Inputs demo (`demos/Inputs.vue`, a toggle between Key Pair and Genesis Document) and Random Inputs in Create share one key pair and one genesis document through the module state in `demos/shared-inputs.ts`, so the user has the secret key that updates the new DID.

The components still use `--vp-c-*` CSS variables from their VitePress origin; `src/styles/custom.css` aliases those to Starlight's `--sl-color-*` palette. Don't remove the alias block.

### Mermaid diagrams
```` ```mermaid ```` fences render client-side via the `astro-mermaid` integration (registered BEFORE `starlight` in `astro.config.mjs`; order matters). Theme switching is automatic. `mermaidConfig.flowchart.wrappingWidth` is 320, so node text wraps less. Diagram sources live inline in the `diagrams/` pages; the Stuart-meets-Satoshi use case sources (architecture, first contact, key rotation with each Beacon Type, state machines for each actor, data movement, data sources, data flow) are kept as `.mmd` files in `public/diagrams/use-case/`. The use case pages render them with `src/components/MermaidFile.astro`: it reads the file at build time (`import.meta.glob` with `?raw`) and writes a `pre.mermaid` element, which the astro-mermaid client script renders. The `.mmd` files stay the only source, and each page links to the raw file. These pages set `tableOfContents: false`; `custom.css` then widens the content column to 67.5rem (about 1020 px). Keep each use case diagram small: one question, about 8 nodes or states or 10 messages, short labels, and a natural width of 1000 px or less, so it shows with no scaling. Put the details in the page text, or link to the other Diagrams pages. The diagrams use the terms of the current spec and stay implementation agnostic. After a spec change, check them against the spec.

### Bitcoin REST, CAS, and fee rate
All networks use the default REST hosts of the api (mempool.space, mutinynet.com). Since api 0.28, the default executor works in a browser (ADR 124). A GET has no `Content-Type`, so the browser sends no CORS preflight (mempool.space answers an `OPTIONS` request with 404). A request for chain data that can change has `fresh: true`, so the executor skips the HTTP cache and adds a unique query string. mutinynet.com sends `max-age=14400` on the chain tip, and a stale tip gives a new beacon signal no confirmations. Do not add a custom executor: it must honor `HttpRequest.fresh`, and the api then ignores `btc.timeoutMs`. The site has no `/mempool` proxy (Vite or nginx) since v2.1.0, no `fetch` monkey-patching, and no env-var config.

`createApiForNetwork()` sets `btc.timeoutMs` to 30 s (the default executor has no timeout) and `cas: { gateway: DEFAULT_CAS_GATEWAY, timeoutMs: 10_000 }` (the api default is 30 s). The api applies its default gateway (`https://trustless-gateway.link`) only if `cas` is absent, so a config with a timeout must name the gateway.

The api has no fee estimate: without `announce.feeRate`, it uses a fixed 5 sat/vB. `estimateFeeRate()` in the composable reads the next-block rate (key `"1"`) from the Esplora route `/fee-estimates` of the network, with a minimum of 1 sat/vB. Update and Deactivate pass it as `announce.feeRate`. If the request fails, the rate is 1 sat/vB, because the demo writes only on test networks. Since api 0.29.1 (ADR 134), a single-party beacon signal spends the confirmed UTXOs of the beacon address, up to 20. The value of each UTXO must be more than the fee of its own input, and the total value must be more than the fee of the transaction.

### Deployment
btcr2.dev is served from a company VM with **no automation**. Release flow: bump `Version:` in `rpm/btcr2-dev.spec` (+ changelog) and `package.json`, push to the GitLab upstream (`gl1.dcdpr.com:website/btcr2-dev.git`), tag `vX.Y.Z`, then file an issue on the internal helpdesk GitLab; third-party IT clones the GitLab repo at the tag, builds an RPM (`rpmbuild -ta`, spec runs `npm install && npm run build` and installs `dist/*` to `/var/www/btcr2-dev`), and installs it. nginx serves the site as static files. The GitHub Actions workflow in `.github/workflows/ci.yml` only verifies: typecheck, `vue-tsc`, a bun run of the two offline examples (`create-key.ts`, `create-external.ts`), and build (weekly cron catches upstream `@did-btcr2` breakage, since no lockfile is committed); it does not deploy.

## Conventions

- License: **MPL-2.0**.
- The site depends on `@did-btcr2/api` only. The api exports only its facade (ADR 132). The api is 0.x and moves fast (a caret range pins the minor version). When bumping, re-run the demos against a test network, including a funded Update on mutinynet.
- The spec itself is **not** in this repo. `src/content/docs/spec.md` only links to `https://dcdpr.github.io/did-btcr2`. Don't try to edit spec content here.
