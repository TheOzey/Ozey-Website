"use client";

import { Alert, Button, Link } from "@heroui/react";
import { classifyError, type DataError } from "@/lib/errors";

const COPY: Record<DataError["kind"], { title: string; description: string }> = {
  "permission-denied": {
    title: "Access denied by the product's security rules",
    description:
      "The product's own security rules denied this read for your account. Access is granted through product permissions (for example shg:read), which the product verifies itself.",
  },
  unauthenticated: {
    title: "Your session has expired",
    description: "Sign in again to continue.",
  },
  "missing-index": {
    title: "This view needs a Firestore index",
    description: "Firestore rejected the query because a required index does not exist yet.",
  },
  unavailable: {
    title: "Could not reach Firestore",
    description: "Check your connection and try again.",
  },
  "not-found": {
    title: "Not found",
    description: "This record does not exist or is no longer available.",
  },
  misconfigured: {
    title: "The console is not configured",
    description: "Firebase environment variables are missing. See .env.example.",
  },
  unknown: {
    title: "Something went wrong",
    description: "The data could not be loaded.",
  },
};

export function DataErrorAlert({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const classified = classifyError(error);
  const copy = COPY[classified.kind];
  const canRetry = onRetry && (classified.kind === "unavailable" || classified.kind === "unknown");
  return (
    <Alert status={classified.kind === "not-found" ? "warning" : "danger"} className={className}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{copy.title}</Alert.Title>
        <Alert.Description>
          {copy.description}
          {classified.kind === "unknown" || classified.kind === "misconfigured" ? (
            <span className="mt-1 block font-mono text-xs opacity-80">{classified.message}</span>
          ) : null}
        </Alert.Description>
        {classified.indexUrl ? (
          <Link className="mt-2 text-sm" href={classified.indexUrl} target="_blank" rel="noopener noreferrer">
            Create the index in Firebase console
            <Link.Icon />
          </Link>
        ) : null}
      </Alert.Content>
      {canRetry ? (
        <Button size="sm" variant="secondary" onPress={onRetry}>
          Retry
        </Button>
      ) : null}
    </Alert>
  );
}
