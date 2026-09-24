/**
 * Format an error for display in a demo response pane. Since api 0.20, the
 * top message of an @did-btcr2/api error already contains the root cause,
 * and `error.cause` holds the same text again. Walk the cause chain, but
 * show a cause only if no earlier line already contains its message.
 */
export function formatError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const lines = [err.message];
  let cause: unknown = err.cause;
  let hops = 0;
  while (cause !== undefined && cause !== null && hops < 16) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message && !lines.some((line) => line.includes(message))) {
      lines.push(`caused by: ${message}`);
    }
    cause = cause instanceof Error ? cause.cause : undefined;
    hops += 1;
  }
  return lines.join('\n');
}
