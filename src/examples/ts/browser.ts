// Browser setup for public endpoints (@did-btcr2/api 0.27.2).
import { createApi, type HttpExecutor } from '@did-btcr2/api';

// 1. The REST client sends `Content-Type: application/json` on every GET.
//    That makes the browser send a CORS preflight, and mempool.space
//    answers the preflight with 404. A GET has no body, so remove it.
// 2. Chain state must not come from a cache. For example, mutinynet.com
//    sends `max-age=14400` on the chain tip, and its CDN can serve a tip
//    that is one block old. With a stale tip, a new beacon signal has no
//    confirmations, and resolution ignores it. `cache: 'no-store'` skips
//    the browser cache, and a unique query string skips the CDN cache.
const browserExecutor: HttpExecutor = (req) => {
  const headers = { ...req.headers };
  if (req.method === 'GET') delete headers['Content-Type'];
  const url = req.url.endsWith('/blocks/tip/height') ? `${req.url}?_=${Date.now()}` : req.url;
  return fetch(url, {
    method: req.method,
    headers,
    body: req.body,
    cache: 'no-store',
    // The api ignores `timeoutMs` if you give an executor.
    signal: AbortSignal.timeout(30_000),
  });
};

const api = createApi({
  btc: { network: 'testnet4', executor: browserExecutor },
  // 3. The default CAS gateway (ipfs.io) is in sunset, and its redirect has
  //    no CORS header. Read CAS content from a gateway that allows CORS.
  cas: { gateway: 'https://trustless-gateway.link' },
});

const result = await api.resolveDid('did:btcr2:k1qsp...'); // a testnet4 DID
console.log(result.didDocument);
