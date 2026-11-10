import { BackendConfigError } from "@/lib/firebase/apps";

export type DataErrorKind =
  | "permission-denied"
  | "unauthenticated"
  | "missing-index"
  | "unavailable"
  | "not-found"
  | "misconfigured"
  | "unknown";

export interface DataError {
  kind: DataErrorKind;
  message: string;
  /** Firestore's one-click index creation link, when it provides one. */
  indexUrl?: string;
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} was not found.`);
    this.name = "NotFoundError";
  }
}

export function classifyError(error: unknown): DataError {
  if (error instanceof BackendConfigError) return { kind: "misconfigured", message: error.message };
  if (error instanceof NotFoundError) return { kind: "not-found", message: error.message };

  const code = (error as { code?: string })?.code ?? "";
  const message = error instanceof Error ? error.message : String(error);

  switch (code) {
    case "permission-denied":
      return { kind: "permission-denied", message };
    case "unauthenticated":
      return { kind: "unauthenticated", message };
    case "failed-precondition": {
      const indexUrl = message.match(/https:\/\/console\.firebase\.google\.com\S+/)?.[0];
      return indexUrl ? { kind: "missing-index", message, indexUrl } : { kind: "unknown", message };
    }
    case "unavailable":
    case "deadline-exceeded":
      return { kind: "unavailable", message };
    default:
      return { kind: "unknown", message };
  }
}
