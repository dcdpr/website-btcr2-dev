// Verify a signed message against the current DID document of its signer.
import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: 'mutinynet' } });

const did = 'did:btcr2:k1q5p...'; // the DID that must have signed
const json = '{ "type": "BTCR2Message", ... }'; // the signed message

// Resolve the current DID document: after a key rotation or a deactivation,
// an old message fails. Add the sidecar data of the DID:
// api.tryResolveDid(did, { sidecar })
const resolution = await api.tryResolveDid(did);
if (!resolution.ok) throw new Error(`${resolution.error}: ${resolution.errorMessage}`);

// verifyMessage does no I/O and does not throw for a bad message. The checks
// run in order (structure, signer, active, assertionMethod, signature) and
// stop at the first failure.
const report = api.btcr2.verifyMessage(resolution.document, JSON.parse(json));

if (report.verified) console.log(report.message);
else console.warn(report.checks.find((check) => !check.ok)); // { name, ok, detail }
