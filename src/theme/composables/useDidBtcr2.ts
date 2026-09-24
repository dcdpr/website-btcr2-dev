import { ref, shallowRef, type Ref } from 'vue';
import type { DidBtcr2Api, HttpExecutor, NetworkName } from '@did-btcr2/api';

// The @did-btcr2 packages are loaded dynamically so Astro SSR never
// evaluates them at build time; the demos are strictly client-side. The
// packages themselves are pure JS (no WASM) and run in Node and browsers.
// The modules are loaded once per page and shared across DemoCard instances.

type ApiNamespace = typeof import('@did-btcr2/api');
type KeypairNamespace = typeof import('@did-btcr2/keypair');
type CommonNamespace = typeof import('@did-btcr2/common');

export type Btcr2Modules = {
  api: ApiNamespace;
  keypair: KeypairNamespace;
  common: CommonNamespace;
};

type LoaderState =
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<Btcr2Modules> }
  | { status: 'ready'; modules: Btcr2Modules }
  | { status: 'error'; error: unknown };

let loaderState: LoaderState = { status: 'idle' };

function loadModules(): Promise<Btcr2Modules> {
  if (loaderState.status === 'ready') return Promise.resolve(loaderState.modules);
  if (loaderState.status === 'loading') return loaderState.promise;
  const promise = Promise.all([
    import('@did-btcr2/api'),
    import('@did-btcr2/keypair'),
    import('@did-btcr2/common'),
  ])
    .then(([api, keypair, common]) => {
      const modules = { api, keypair, common };
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
  return fetch(req.url, {
    method: req.method,
    headers,
    body: req.body,
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

  return { ready, error, load, modules, createApiForNetwork };
}
