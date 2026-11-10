import { formatCurrency } from "@/lib/format";
import type { ShgTransaction } from "../types";

/** Money in for the group is shown plain; money out (disbursements) and reversals are marked. */
export function TransactionAmount({ tx }: { tx: ShgTransaction }) {
  if (tx.isReversal) return <span className="text-danger tabular">{formatCurrency(tx.amount)}</span>;
  if (tx.kind === "disbursement") return <span className="text-foreground tabular">−{formatCurrency(tx.amount)}</span>;
  return <span className="text-foreground tabular">{formatCurrency(tx.amount)}</span>;
}
