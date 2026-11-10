/**
 * Opaque pagination cursors for merged, multi-source SHG queries.
 *
 * A cursor records, per source, the path of the last document already shown
 * (or "done"). The server re-reads that document as the `startAfter` anchor,
 * so every anchor path is validated against the source it claims to belong
 * to: a forged cursor can never make the server read an arbitrary document.
 */
export type SourceState = string | "done";
export type CursorState = Record<string, SourceState>;

export class InvalidCursorError extends Error {
  constructor() {
    super("Invalid pagination cursor");
    this.name = "InvalidCursorError";
  }
}

export function encodeCursor(state: CursorState): string {
  return Buffer.from(JSON.stringify({ v: 1, s: state }), "utf8").toString("base64url");
}

/**
 * @param allowedPathPrefix maps a source key to the collection path its
 *   anchors must live in (e.g. "groups/g1/savings/"). Unknown keys are rejected.
 */
export function decodeCursor(
  raw: string | null | undefined,
  allowedPathPrefix: (sourceKey: string) => string | null,
): CursorState | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    throw new InvalidCursorError();
  }
  const s = (parsed as { v?: unknown; s?: unknown })?.s;
  if ((parsed as { v?: unknown }).v !== 1 || !s || typeof s !== "object" || Array.isArray(s)) {
    throw new InvalidCursorError();
  }
  const state: CursorState = {};
  for (const [key, value] of Object.entries(s as Record<string, unknown>)) {
    const prefix = allowedPathPrefix(key);
    if (!prefix || typeof value !== "string") throw new InvalidCursorError();
    if (value !== "done") {
      const docId = value.slice(prefix.length);
      if (!value.startsWith(prefix) || docId.length === 0 || docId.includes("/")) throw new InvalidCursorError();
    }
    state[key] = value;
  }
  return state;
}
