// Create a `did:btcr2:x1…` identifier from an intermediate DID document.
// The placeholder ID is replaced throughout the document by the encoded DID.
import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: 'regtest' } });

const PLACEHOLDER =
  'did:btcr2:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

const intermediateDocument = {
  '@context': ['https://www.w3.org/TR/did-1.1', 'https://btcr2.dev/context'],
  id: PLACEHOLDER,
  controller: [PLACEHOLDER],
  verificationMethod: [
    {
      id: `${PLACEHOLDER}#key-0`,
      type: 'Multikey',
      controller: PLACEHOLDER,
      publicKeyMultibase: 'zQ3shRAtucgse3YhPjptmFaUKAtTyoqaSAkpj3J1UT2jtMcvg',
    },
  ],
  authentication: [`${PLACEHOLDER}#key-0`],
  assertionMethod: [`${PLACEHOLDER}#key-0`],
  capabilityInvocation: [`${PLACEHOLDER}#key-0`],
  capabilityDelegation: [`${PLACEHOLDER}#key-0`],
};

const genesisBytes = new TextEncoder().encode(JSON.stringify(intermediateDocument));
const did = api.createDid('external', genesisBytes, { network: 'regtest' });

console.log({ did });

api.dispose();
