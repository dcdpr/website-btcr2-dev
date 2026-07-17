import { ref, shallowRef, type Ref } from 'vue';
import type { DidBtcr2Api, NetworkName } from '@did-btcr2/api';

// The @did-btcr2 packages are loaded dynamically so VitePress SSR never
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

// In dev, route the library's Esplora REST hosts through the Vite proxy
// entries declared in config.ts (server.proxy) to sidestep CORS. In
// production the library defaults (mempool.space / mutinynet.com) are used
// directly. regtest keeps its localhost default in both modes.
const DEV_REST_HOSTS: Partial<Record<NetworkName, string>> = {
  bitcoin: '/mempool/api',
  testnet3: '/mempool/testnet/api',
  testnet4: '/mempool/testnet4/api',
  signet: '/mempool/signet/api',
  mutinynet: '/mutinynet/api',
};

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
    const host = import.meta.env.DEV ? DEV_REST_HOSTS[network] : undefined;
    return modules.value.api.createApi({
      btc: host ? { network, rest: { host } } : { network },
    });
  }

  return { ready, error, load, modules, createApiForNetwork };
}
