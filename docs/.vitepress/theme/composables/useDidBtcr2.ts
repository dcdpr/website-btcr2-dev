import { ref, shallowRef, type Ref } from 'vue';
import type { DidBtcr2Api } from '@did-btcr2/api';

// @did-btcr2/* ships browser builds with WASM + top-level await, so dynamic
// import is required to keep VitePress SSR off this path. The module is
// loaded once per page and shared across DemoCard instances.

type ApiNamespace = typeof import('@did-btcr2/api');
type MethodNamespace = typeof import('@did-btcr2/method');

type LoaderState =
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<{ api: ApiNamespace; method: MethodNamespace }> }
  | { status: 'ready'; api: ApiNamespace; method: MethodNamespace }
  | { status: 'error'; error: unknown };

let loaderState: LoaderState = { status: 'idle' };

function loadModules() {
  if (loaderState.status === 'ready' || loaderState.status === 'loading') {
    return loaderState.status === 'ready'
      ? Promise.resolve({ api: loaderState.api, method: loaderState.method })
      : loaderState.promise;
  }
  const promise = Promise.all([import('@did-btcr2/api'), import('@did-btcr2/method')])
    .then(([api, method]) => {
      loaderState = { status: 'ready', api, method };
      return { api, method };
    })
    .catch((error) => {
      loaderState = { status: 'error', error };
      throw error;
    });
  loaderState = { status: 'loading', promise };
  return promise;
}

export type UseDidBtcr2 = {
  ready: Ref<boolean>;
  error: Ref<unknown>;
  load: () => Promise<{ api: ApiNamespace; method: MethodNamespace }>;
  modules: Ref<{ api: ApiNamespace; method: MethodNamespace } | null>;
  /** Create a configured DidBtcr2Api instance for the given network. Caller owns disposal. */
  createApiForNetwork: (network: string) => DidBtcr2Api;
};

export function useDidBtcr2(): UseDidBtcr2 {
  const ready = ref(false);
  const error = ref<unknown>(null);
  const modules = shallowRef<{ api: ApiNamespace; method: MethodNamespace } | null>(null);

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
  // for the WASM bundles overlaps with the user reading the page.
  load().catch(() => {
    /* surfaced via error ref */
  });

  function createApiForNetwork(network: string): DidBtcr2Api {
    if (!modules.value) {
      throw new Error('@did-btcr2 modules not loaded yet — await load() first');
    }
    return modules.value.api.createApi({ btc: { network: network as never } });
  }

  return { ready, error, load, modules, createApiForNetwork };
}
