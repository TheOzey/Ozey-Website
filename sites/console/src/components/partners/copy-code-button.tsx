"use client";

import { Button } from "@heroui/react";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** Copies a Partner ID to the clipboard. */
export function CopyCodeButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      size="sm"
      variant="secondary"
      aria-label={`${label} ${value}`}
      data-action="copy-code"
      onPress={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? "Copied" : label}
    </Button>
  );
}
