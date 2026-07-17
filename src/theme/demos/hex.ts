const HEX_RE = /^[0-9a-fA-F]+$/;

export function isHex(s: string): boolean {
  return HEX_RE.test(s) && s.length % 2 === 0;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  if (!isHex(clean)) {
    throw new Error('Invalid hex');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
