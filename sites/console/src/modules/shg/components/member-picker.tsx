"use client";

import { ComboBox, Input, Label, ListBox } from "@heroui/react";
import { useGroupRoster } from "../queries";

/** Member filter within one group. Rosters are small, so filtering is client-side. */
export function MemberPicker({
  groupId,
  value,
  onChange,
  className = "w-full sm:w-56",
}: {
  groupId: string | null;
  value: string | null;
  onChange: (memberId: string | null) => void;
  className?: string;
}) {
  const roster = useGroupRoster(groupId ?? "");
  const disabled = !groupId;

  return (
    <ComboBox
      className={className}
      isDisabled={disabled || roster.isError}
      selectedKey={groupId ? value : null}
      onSelectionChange={(key) => onChange(key ? String(key) : null)}
      allowsEmptyCollection
    >
      <Label className="sr-only">Member</Label>
      <ComboBox.InputGroup>
        <Input placeholder={disabled ? "Pick a group first" : roster.isPending ? "Loading members…" : "All members"} />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox
          items={roster.data ?? []}
          renderEmptyState={() => <div className="px-3 py-2 text-sm text-muted">No members found.</div>}
        >
          {(member) => (
            <ListBox.Item id={member.id} textValue={member.name}>
              {member.name}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}
