import { ref, shallowRef, type Ref } from 'vue';
import type { DidBtcr2Api, HttpExecutor, NetworkName } from '@did-btcr2/api';

// The @did-btcr2/api package is loaded dynamically so Astro SSR never
// evaluates it at build time; the demos are strictly client-side. The
// package is pure JS (no WASM) and runs in Node and browsers. It re-exports
// the keypair, signer, and genesis document helpers that the demos use.
// The module is loaded once per page and shared across DemoCard instances.

type ApiNamespace = typeof import('@did-btcr2/api');

export type Btcr2Modules = {
  api: ApiNamespace;
};

/** The networks that the api accepts, in the order the demos list them. */
export const NETWORKS: readonly NetworkName[] = [
  'bitcoin',
  'testnet3',
  'testnet4',
  'signet',
  'mutinynet',
  'regtest',
];

type LoaderState =
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<Btcr2Modules> }
  | { status: 'ready'; modules: Btcr2Modules }
  | { status: 'error'; error: unknown };

let loaderState: LoaderState = { status: 'idle' };

function loadModules(): Promise<Btcr2Modules> {
  if (loaderState.status === 'ready') return Promise.resolve(loaderState.modules);
  if (loaderState.status === 'loading') return loaderState.promise;
  const promise = import('@did-btcr2/api')
    .then((api) => {
      const modules = { api };
      loaderState = { status: 'ready', modules };
      return modules;
    })
    .catch((error) => {
      loaderState = { status: 'error', error };
      throw error;
    });
  loaderState = { status: 'loading', promise };
  return promise;
}

// The @did-btcr2/bitcoin REST client sends `Content-Type: application/json`
// on every GET. A GET has no body, so the header has no function, but it makes
// the request non-simple. The browser then sends a CORS preflight, and the
// mempool.space OPTIONS handler answers 404. This executor removes the header
// from GET requests, so the browser sends no preflight. POST /tx uses
// `text/plain`, which is CORS-safelisted. With this executor, all networks
// use the library's default REST hosts, and the site needs no proxy.
// Remove it when upstream stops sending the header on GET.
const REQUEST_TIMEOUT_MS = 30_000;

const corsSafeExecutor: HttpExecutor = (req) => {
  const headers = { ...req.headers };
  if (req.method === 'GET') {
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === 'content-type') delete headers[name];
    }
  }
  // The api ignores `timeoutMs` when a custom executor is set, so the
  // executor sets its own timeout.
  // Chain state must never come from a cache. mutinynet.com sends
  // `max-age=14400` on /blocks/tip/height, and its CDN serves a tip that
  // can be one block old. With a stale tip, a new beacon signal gets no
  // confirmations, and resolution ignores it. `no-store` skips the browser
  // cache, and a unique query string skips the CDN cache.
  const url = req.url.endsWith('/blocks/tip/height') ? `${req.url}?_=${Date.now()}` : req.url;
  return fetch(url, {
    method: req.method,
    headers,
    body: req.body,
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
};

// The library default CAS gateway (ipfs.io) is in sunset. Its redirect to
// trustless-gateway.link has no CORS header, so browser CAS reads fail.
// Read CAS content from the trustless gateway directly.
const CAS_GATEWAY = 'https://trustless-gateway.link';

export type UseDidBtcr2 = {
  ready: Ref<boolean>;
  error: Ref<unknown>;
  load: () => Promise<Btcr2Modules>;
  modules: Ref<Btcr2Modules | null>;
  /** Create a configured DidBtcr2Api instance for the given network. Caller owns disposal. */
  createApiForNetwork: (network: NetworkName) => DidBtcr2Api;
  /** The network that a did:btcr2 identifier encodes, or null if it does not decode. */
  networkOf: (did: string) => NetworkName | null;
};

export function useDidBtcr2(): UseDidBtcr2 {
  const ready = ref(false);
  const error = ref<unknown>(null);
  const modules = shallowRef<Btcr2Modules | null>(null);

  const load = () =>
    loadModules()
      .then((mods) => {
        modules.value = mods;
        ready.value = true;
        return mods;
      })
      .catch((err) => {
        error.value = err;
        ready.value = false;
        throw err;
      });

  // Eagerly start loading on composable instantiation so the network round-trip
  // for the bundles overlaps with the user reading the page.
  load().catch(() => {
    /* surfaced via error ref */
  });

  function createApiForNetwork(network: NetworkName): DidBtcr2Api {
    if (!modules.value) {
      throw new Error('@did-btcr2 modules not loaded yet - await load() first');
    }
    return modules.value.api.createApi({
      btc: { network, executor: corsSafeExecutor },
      cas: { gateway: CAS_GATEWAY },
    });
  }

  // The api refuses to resolve or update a DID on a connection for a
  // different network, so the demos take the network from the DID itself.
  function networkOf(did: string): NetworkName | null {
    if (!modules.value || !did.startsWith('did:btcr2:')) return null;
    try {
      const { network } = modules.value.api.Identifier.decode(did);
      return (NETWORKS as readonly string[]).includes(network) ? (network as NetworkName) : null;
    } catch {
      return null;
    }
  }

  return { ready, error, load, modules, createApiForNetwork, networkOf };
}
