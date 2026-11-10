"use client";

import { Alert, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CenteredAuthLayout } from "@/components/shell/centered-auth-layout";
import { describeSignInError, signInWithGoogleAndCreateSession } from "@/lib/auth/google-sign-in";

const INACTIVE_COPY: Record<string, string> = {
  suspended: "Your console access is suspended. Contact an Ozey console administrator.",
  offboarded: "This account no longer has console access.",
  "not-an-employee": "This account is not linked to an Ozey employee record.",
  invited: "Your employee record is not active yet. Sign in again to activate it.",
};

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 18 18" className="size-[18px]">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

export function LoginForm({ next, inactiveReason }: { next: string; inactiveReason: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(inactiveReason ? (INACTIVE_COPY[inactiveReason] ?? null) : null);

  async function signIn() {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogleAndCreateSession();
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(describeSignInError(err));
      setPending(false);
    }
  }

  return (
    <CenteredAuthLayout>
      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-xl font-semibold tracking-[-0.02em]">Sign in</h1>
        <p className="mt-1.5 text-sm text-muted">Use the Google account registered as your Ozey employee identity.</p>

        {error ? (
          <Alert status="danger" className="mt-5">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <Button className="mt-6" variant="secondary" fullWidth isPending={pending} onPress={signIn}>
          {pending ? null : <GoogleMark />}
          Continue with Google
        </Button>
      </div>
      <p className="mt-6 text-center text-xs text-muted">Internal tool for Ozey employees. Sign-ins are logged.</p>
    </CenteredAuthLayout>
  );
}
