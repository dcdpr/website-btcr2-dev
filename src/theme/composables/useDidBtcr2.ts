import { ref, shallowRef, type Ref } from 'vue';
import type { DidBtcr2Api, NetworkName } from '@did-btcr2/api';

// The @did-btcr2/api package is loaded dynamically so Astro SSR never
// evaluates it at build time; the demos are strictly client-side. The
// package is pure JS (no WASM) and runs in Node and browsers. It exports
// only its facade: the demos call `createApi` and the sub-facades of the api.
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

/**
 * The networks on which the demos create and update DIDs. Mainnet is not in
 * the list: the page must not handle keys that control real funds. Resolve
 * is read-only, so it also accepts a mainnet DID.
 */
export const TEST_NETWORKS: readonly NetworkName[] = NETWORKS.filter((n) => n !== 'bitcoin');

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

// The default Bitcoin executor of the api has no timeout, so the demos set
// one. A CAS read of an object that the CAS does not hold waits for the full
// CAS timeout. The api default is 30 seconds; the demos wait 10 seconds.
const BTC_TIMEOUT_MS = 30_000;
const CAS_TIMEOUT_MS = 10_000;

// An api with no Bitcoin connection, for the local operations: keys,
// identifiers, and documents. The demos on one page share it.
let localApi: DidBtcr2Api | null = null;

/**
 * The fee rate, in sat/vB, of a transaction for the next block. The value
 * comes from the Esplora route `/fee-estimates` of the network of the api.
 * The api has no fee estimate of its own: without `announce.feeRate`, it
 * uses a fixed 5 sat/vB. The result is 1 sat/vB or more, the minimum relay
 * fee of most nodes. If the request fails, the result is undefined, and the
 * api uses its default.
 */
export async function estimateFeeRate(api: DidBtcr2Api): Promise<number | undefined> {
  try {
    const res = await fetch(`${api.btc.rest.config.host}/fee-estimates`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(BTC_TIMEOUT_MS),
    });
    if (!res.ok) return undefined;
    const rate = ((await res.json()) as Record<string, unknown>)['1'];
    return typeof rate === 'number' && Number.isFinite(rate) ? Math.max(rate, 1) : undefined;
  } catch {
    return undefined;
  }
}

export type UseDidBtcr2 = {
  ready: Ref<boolean>;
  error: Ref<unknown>;
  load: () => Promise<Btcr2Modules>;
  modules: Ref<Btcr2Modules | null>;
  /** Create a configured DidBtcr2Api instance for the given network. Caller owns disposal. */
  createApiForNetwork: (network: NetworkName) => DidBtcr2Api;
  /** The shared api with no Bitcoin connection, for keys, identifiers, and documents. Do not dispose it. */
  getLocalApi: () => DidBtcr2Api;
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
    // The api applies its default CAS gateway only if `cas` is absent, so
    // a config with a timeout must also name the gateway.
    return modules.value.api.createApi({
      btc: { network, timeoutMs: BTC_TIMEOUT_MS },
      cas: { gateway: modules.value.api.DEFAULT_CAS_GATEWAY, timeoutMs: CAS_TIMEOUT_MS },
    });
  }

  function getLocalApi(): DidBtcr2Api {
    if (!modules.value) {
      throw new Error('@did-btcr2 modules not loaded yet - await load() first');
    }
    return (localApi ??= modules.value.api.createApi());
  }

  // The api refuses to resolve or update a DID on a connection for a
  // different network, so the demos take the network from the DID itself.
  function networkOf(did: string): NetworkName | null {
    if (!modules.value || !did.startsWith('did:btcr2:')) return null;
    try {
      const { network } = getLocalApi().did.decode(did);
      return (NETWORKS as readonly string[]).includes(network) ? (network as NetworkName) : null;
    } catch {
      return null;
    }
  }

  return { ready, error, load, modules, createApiForNetwork, getLocalApi, networkOf };
}
