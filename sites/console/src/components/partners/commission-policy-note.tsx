import { COMMISSION_POLICY_V1 } from "@/lib/partners/model";

/** Displays approved commission rates as policy — never as calculated earnings. */
export function CommissionPolicyNote() {
  return (
    <div className="border border-border bg-surface px-4 py-3 text-sm" data-policy={COMMISSION_POLICY_V1.version}>
      <div className="font-medium text-foreground">Commission policy ({COMMISSION_POLICY_V1.version})</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
        <li>{COMMISSION_POLICY_V1.newOnboardingLabel}</li>
        <li>{COMMISSION_POLICY_V1.renewalLabel}</li>
      </ul>
      <p className="mt-2 text-xs text-muted">Rates are approved business rules. Earnings are not calculated until subscription billing is connected.</p>
    </div>
  );
}
