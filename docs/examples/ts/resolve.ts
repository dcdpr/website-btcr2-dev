// Resolve a `did:btcr2` identifier. The api injects the configured Bitcoin
// connection so beacon signals are fetched automatically.
import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: 'regtest' } });

const did =
  'did:btcr2:k1qgpgwtp2dpe3thqny6jngl5eg6p4wghd04yj70jcp8qe4nh75hd4dhc8f08q4';

const result = await api.resolveDid(did);
console.log(result.didDocument);

// For did:btcr2:x1… identifiers, supply sidecar data alongside.
// const result = await api.resolveDid(did, { sidecar: { initialDocument: {...} } });

api.dispose();
