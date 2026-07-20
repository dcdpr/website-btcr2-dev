/**
 * Format an error for display in a demo response pane. The @did-btcr2/api
 * facade wraps every failure in a generic Error ("Failed to resolve DID: ...")
 * and puts the actual reason in `error.cause`, which neither `message` nor
 * `stack` includes, so walk the cause chain explicitly.
 */
export function formatError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const lines = [err.message];
  let cause: unknown = err.cause;
  while (cause !== undefined && cause !== null) {
    lines.push(`caused by: ${cause instanceof Error ? cause.message : String(cause)}`);
    cause = cause instanceof Error ? cause.cause : undefined;
  }
  return lines.join('\n');
}
