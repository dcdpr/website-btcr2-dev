const SIDECAR_KEYS = ['genesisDocument', 'updates', 'casUpdates', 'smtProofs'];

/**
 * Parse the sidecar text of a demo form. The library reads the genesis
 * document from `sidecar.genesisDocument`. Accept either a full sidecar
 * object or a bare placeholder-form genesis document (the Create demo's
 * textarea content), and wrap the latter.
 * Returns undefined when the text is empty, invalid JSON, or an empty object.
 */
export function normalizeSidecar(raw: string): Record<string, unknown> | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const obj = parsed as Record<string, unknown>;
  if (Object.keys(obj).length === 0) return undefined;
  if (SIDECAR_KEYS.some((k) => k in obj)) return obj;
  if (typeof obj.id === 'string') return { genesisDocument: obj };
  return obj;
}
