import type { ReactNode } from "react";
import { availabilityMessage } from "@/lib/partners/availability";
import type { MetricValue } from "@/lib/partners/types";

/**
 * Reusable partner metric tile. Distinguishes unavailable data from a genuine
 * zero — never renders a fabricated ₹0 when the source is not connected.
 */
export function MetricCard({
  label,
  metric,
  format = "number",
}: {
  label: string;
  metric: MetricValue;
  format?: "number" | "currency";
}) {
  return (
    <div className="border border-border bg-surface px-4 py-3" data-metric={label} data-state={metric.state}>
      <div className="text-xs font-medium text-muted">{label}</div>
      {metric.state === "ready" ? (
        <div className="mt-1.5 text-lg font-semibold tabular text-foreground">
          {format === "currency" ? formatCurrency(metric.value) : metric.value.toLocaleString("en-IN")}
        </div>
      ) : (
        <div className="mt-1.5">
          <div className="text-sm font-medium text-muted">Unavailable</div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted">{shortReason(metric.reason)}</p>
        </div>
      )}
    </div>
  );
}

function shortReason(reason: "awaiting_attribution" | "billing_not_connected") {
  return reason === "billing_not_connected" ? "Billing not connected" : "Awaiting SHG attribution";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function MetricSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

export function UnavailableBanner({ reason }: { reason: "awaiting_attribution" | "billing_not_connected" }) {
  return (
    <div className="border border-border bg-surface px-4 py-3 text-sm text-muted" data-state="data-unavailable" data-reason={reason}>
      {availabilityMessage(reason)}
    </div>
  );
}
