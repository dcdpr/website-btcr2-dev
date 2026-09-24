// Resolve a `did:btcr2` identifier. The api reads the beacon signals from
// the Bitcoin connection, which must be on the network of the DID.
import { createApi, type Sidecar } from '@did-btcr2/api';

const api = createApi({ btc: { network: 'mutinynet' } });
const did = 'did:btcr2:k1q5p...'; // your DID

// Without sidecar data, resolution works for a k1 DID with no updates, and
// for a DID whose updates are in a CAS. tryResolveDid gives a DID Resolution
// error code instead of a throw.
const attempt = await api.tryResolveDid(did);
if (attempt.ok) console.log(attempt.document, attempt.metadata);
else console.warn(attempt.error, attempt.errorMessage); // e.g. MISSING_UPDATE_DATA

// Sidecar data comes from the DID controller:
// - An x1 DID needs its genesis document.
// - A DID with updates needs every signed update, unless a CAS holds them.
const sidecar: Sidecar = {
  updates: [/* the signed updates of the DID, in order */],
};

// minConf (default 6) is the number of confirmations that a beacon signal
// needs before resolution applies it. A lower value shows an update sooner.
const result = await api.resolveDid(did, { sidecar, minConf: 1 });
// didDocumentMetadata: { versionId, confirmations, deactivated, updated? }
console.log(result.didDocument, result.didDocumentMetadata);
