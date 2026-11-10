"use client";

import { Alert, Button, FieldError, Input, Label, ListBox, Select, Spinner, TextField } from "@heroui/react";
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { DetailList } from "@/components/data/detail-list";
import { CopyCodeButton } from "@/components/partners/copy-code-button";
import { Panel } from "@/components/page/panel";
import {
  PARTNER_ADDRESS_FIELDS,
  PARTNER_TYPES,
  PARTNER_TYPE_LABEL,
  type PartnerAddressKey,
  type PartnerFieldErrors,
  type PartnerType,
  validateNewPartner,
} from "@/lib/partners/model";

interface Created {
  partnerNumber: string;
  displayName: string;
  partnerType: PartnerType;
  mobile: string;
  status: "active";
}

type Values = {
  firstName: string;
  secondName: string;
  lastName: string;
  mobile: string;
  email: string;
  partnerType: PartnerType | "";
  joinedAt: string;
  address: Record<PartnerAddressKey, string>;
  state: string;
  district: string;
  mandal: string;
  village: string;
};

const EMPTY: Values = {
  firstName: "",
  secondName: "",
  lastName: "",
  mobile: "",
  email: "",
  partnerType: "",
  joinedAt: "",
  address: Object.fromEntries(PARTNER_ADDRESS_FIELDS.map((f) => [f.key, ""])) as Record<PartnerAddressKey, string>,
  state: "",
  district: "",
  mandal: "",
  village: "",
};

const FAILURE: Record<number, string> = {
  401: "Your session has ended. Sign in again, then retry.",
  403: "You don't have permission to manage partners.",
  404: "This partner no longer exists.",
  409: "This partner can no longer be edited.",
};

export interface EditPartnerTarget {
  partnerNumber: string;
  initial: {
    firstName: string;
    secondName: string;
    lastName: string;
    mobile: string;
    email: string;
    partnerType: PartnerType;
    joinedAt: string;
    address: Record<string, string>;
    territory: { state?: string; district?: string; mandal?: string; village?: string };
  };
}

export function NewPartnerForm({ edit }: { edit?: EditPartnerTarget }) {
  const initialValues: Values = edit
    ? {
        firstName: edit.initial.firstName,
        secondName: edit.initial.secondName,
        lastName: edit.initial.lastName,
        mobile: edit.initial.mobile,
        email: edit.initial.email,
        partnerType: edit.initial.partnerType,
        joinedAt: edit.initial.joinedAt,
        address: Object.fromEntries(PARTNER_ADDRESS_FIELDS.map((f) => [f.key, edit.initial.address[f.key] ?? ""])) as Record<
          PartnerAddressKey,
          string
        >,
        state: edit.initial.territory.state ?? "",
        district: edit.initial.territory.district ?? "",
        mandal: edit.initial.territory.mandal ?? "",
        village: edit.initial.territory.village ?? "",
      }
    : EMPTY;

  const [values, setValues] = useState<Values>(initialValues);
  const [updated, setUpdated] = useState<{ changed: string[] } | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<PartnerFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  const payload = {
    firstName: values.firstName,
    secondName: values.secondName || undefined,
    lastName: values.lastName,
    mobile: values.mobile,
    email: values.email || undefined,
    partnerType: values.partnerType || undefined,
    joinedAt: values.joinedAt || undefined,
    address: values.address,
    territory: {
      state: values.state || undefined,
      district: values.district || undefined,
      mandal: values.mandal || undefined,
      village: values.village || undefined,
    },
  };

  const check = validateNewPartner(payload);
  const clientErrors: PartnerFieldErrors = check.ok ? {} : check.errors;
  const profileHref = (partnerNumber: string) => `/partners/${encodeURIComponent(partnerNumber)}`;
  const errorFor = (key: keyof PartnerFieldErrors) =>
    serverErrors[key] ?? (submitted || touched.has(key) ? clientErrors[key] : undefined);

  const set = (key: keyof PartnerFieldErrors, apply: (v: Values) => Values) => {
    setValues(apply);
    if (serverErrors[key]) setServerErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)));
  };
  const touch = (key: string) => setTouched((t) => new Set(t).add(key));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitted(true);
    setFormError(null);
    if (!check.ok) return;
    setSubmitting(true);
    try {
      const res = await fetch(edit ? `/dashboard/api/partners/${encodeURIComponent(edit.partnerNumber)}` : "/dashboard/api/partners", {
        method: edit ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as {
        partner?: Created;
        fields?: PartnerFieldErrors;
        message?: string;
        changed?: string[];
      };
      if (!edit && res.status === 201 && body.partner) {
        setCreated(body.partner);
        return;
      }
      if (edit && res.status === 200) {
        setUpdated({ changed: body.changed ?? [] });
        return;
      }
      if (body.fields && Object.keys(body.fields).length > 0) setServerErrors(body.fields);
      else
        setFormError(
          body.message ?? FAILURE[res.status] ?? `The partner could not be ${edit ? "updated" : "created"}. Nothing was saved; try again.`,
        );
    } catch {
      setFormError("The Console could not be reached. Nothing was saved; check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (edit && updated) {
    return (
      <Panel>
        <div className="flex flex-col gap-6" data-state="partner-updated">
          <div className="flex items-start gap-3">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {updated.changed.length ? "Changes saved" : "No changes to save"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {updated.changed.length
                  ? `Updated ${edit.partnerNumber}: ${updated.changed.join(", ")}.`
                  : `${edit.partnerNumber} already matched what you submitted.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={profileHref(edit.partnerNumber)} className="button button--primary button--md">
              View profile
            </Link>
            <Link href="/partners" className="button button--primary button--md">
              Back to Partners
            </Link>
          </div>
        </div>
      </Panel>
    );
  }

  if (created) {
    return (
      <Panel>
        <div className="flex flex-col gap-6" data-state="partner-created">
          <div className="flex items-start gap-3">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div>
              <h2 className="text-base font-semibold text-foreground">Partner created</h2>
              <p className="mt-1 text-sm text-muted">
                {created.displayName} is active as {PARTNER_TYPE_LABEL[created.partnerType]}. Share their Partner ID for SHG
                attribution when that flow is live.
              </p>
            </div>
          </div>
          <DetailList
            columns={2}
            items={[
              {
                label: "Partner ID",
                value: (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold">{created.partnerNumber}</span>
                    <CopyCodeButton value={created.partnerNumber} />
                  </span>
                ),
              },
              { label: "Name", value: created.displayName },
              { label: "Type", value: PARTNER_TYPE_LABEL[created.partnerType] },
              { label: "Mobile", value: created.mobile },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Link href={profileHref(created.partnerNumber)} className="button button--primary button--md">
              View profile
            </Link>
            <Link href="/partners" className="button button--primary button--md">
              Back to Partners
            </Link>
            <Button
              variant="secondary"
              onPress={() => {
                setCreated(null);
                setValues(EMPTY);
                setTouched(new Set());
                setSubmitted(false);
              }}
            >
              Add another partner
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  const text = (
    key: "firstName" | "secondName" | "lastName" | "mobile" | "email" | "state" | "district" | "mandal" | "village",
    label: string,
    opts: { required?: boolean; type?: string; autoComplete?: string } = {},
  ) => (
    <TextField
      name={key}
      type={opts.type ?? "text"}
      isRequired={opts.required}
      value={values[key]}
      onChange={(v) => set(key, (s) => ({ ...s, [key]: v }))}
      onBlur={() => touch(key)}
      isInvalid={Boolean(errorFor(key))}
      validationBehavior="aria"
    >
      <Label>
        {label}
        {opts.required ? null : <span className="font-normal text-muted"> (optional)</span>}
      </Label>
      <Input autoComplete={opts.autoComplete} />
      <FieldError>{errorFor(key)}</FieldError>
    </TextField>
  );

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6" aria-busy={submitting}>
      {formError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{formError}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {edit ? (
        <Panel title="Partner ID" description="Assigned when the partner was created. It is permanent and never reused.">
          <span className="font-mono text-sm font-semibold text-foreground" data-field="partner-number">
            {edit.partnerNumber}
          </span>
        </Panel>
      ) : null}

      <Panel title="Personal information" description="Partners do not sign in to Console and have no authorization roles.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {text("firstName", "First name", { required: true, autoComplete: "given-name" })}
          {text("secondName", "Second name", { autoComplete: "additional-name" })}
          {text("lastName", "Last name", { required: true, autoComplete: "family-name" })}
          {text("mobile", "Mobile", { required: true, autoComplete: "tel" })}
          <div className="sm:col-span-2">{text("email", "Email", { type: "email", autoComplete: "email" })}</div>
          <TextField
            name="joinedAt"
            type="date"
            value={values.joinedAt}
            onChange={(v) => set("joinedAt", (s) => ({ ...s, joinedAt: v }))}
            onBlur={() => touch("joinedAt")}
            isInvalid={Boolean(errorFor("joinedAt"))}
            validationBehavior="aria"
          >
            <Label>
              Joining date <span className="font-normal text-muted"> (optional)</span>
            </Label>
            <Input />
            <FieldError>{errorFor("joinedAt")}</FieldError>
          </TextField>
        </div>
      </Panel>

      <Panel title="Partner type" description="Determines the Partner ID prefix (OZEY-DS or OZEY-DST). Changing type later keeps the same ID.">
        <Select
          name="partnerType"
          isRequired
          placeholder="Select partner type"
          value={values.partnerType || null}
          onChange={(key) => {
            touch("partnerType");
            set("partnerType", (s) => ({ ...s, partnerType: (key ? String(key) : "") as PartnerType | "" }));
          }}
          onBlur={() => touch("partnerType")}
          isInvalid={Boolean(errorFor("partnerType"))}
          validationBehavior="aria"
          className="max-w-xl"
        >
          <Label>Partner type</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {PARTNER_TYPES.map((t) => (
                <ListBox.Item key={t} id={t} textValue={PARTNER_TYPE_LABEL[t]}>
                  {PARTNER_TYPE_LABEL[t]}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          <FieldError>{errorFor("partnerType")}</FieldError>
        </Select>
      </Panel>

      <Panel title="Territory" description="Optional. Used for directory filters and future assignment rules.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {text("state", "State")}
          {text("district", "District")}
          {text("mandal", "Mandal / Block")}
          {text("village", "Village")}
        </div>
      </Panel>

      <Panel title="Address" description="Optional.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PARTNER_ADDRESS_FIELDS.map(({ key, label }) => (
            <TextField
              key={key}
              name={key}
              value={values.address[key]}
              onChange={(v) => set(key, (s) => ({ ...s, address: { ...s.address, [key]: v } }))}
              onBlur={() => touch(key)}
              isInvalid={Boolean(errorFor(key))}
              validationBehavior="aria"
            >
              <Label>{label}</Label>
              <Input autoComplete={key === "postalCode" ? "postal-code" : undefined} />
              <FieldError>{errorFor(key)}</FieldError>
            </TextField>
          ))}
        </div>
      </Panel>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/partners" className="button button--ghost button--md">
          Cancel
        </Link>
        <Button type="submit" variant="primary" isDisabled={submitting} isPending={submitting}>
          {submitting ? <Spinner size="sm" color="current" /> : null}
          {submitting ? (edit ? "Saving…" : "Creating…") : edit ? "Save changes" : "Create partner"}
        </Button>
      </div>
    </form>
  );
}
