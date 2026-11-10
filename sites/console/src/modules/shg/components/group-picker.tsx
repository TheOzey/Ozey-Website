"use client";

import { ComboBox, Input, Label, ListBox } from "@heroui/react";
import { useState } from "react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useGroup, useGroupSearch } from "../queries";

/**
 * Group filter backed by a server-side prefix search (10 results), so the
 * picker never downloads the whole groups collection.
 */
export function GroupPicker({
  value,
  onChange,
  className = "w-full sm:w-64",
}: {
  value: string | null;
  onChange: (groupId: string | null) => void;
  className?: string;
}) {
  const selected = useGroup(value ?? "");
  const selectedName = value ? (selected.data?.name ?? "") : "";
  const [input, setInput] = useState<string | null>(null);
  const inputValue = input ?? selectedName;
  const term = useDebouncedValue(input !== null && input !== selectedName ? input : "");
  const results = useGroupSearch(term);

  const items = results.data ?? [];
  const withSelected =
    value && selected.data && !items.some((g) => g.id === value) ? [selected.data, ...items] : items;

  return (
    <ComboBox
      className={className}
      allowsEmptyCollection
      menuTrigger="focus"
      inputValue={inputValue}
      onInputChange={(text) => {
        setInput(text);
        if (text === "" && value) onChange(null);
      }}
      selectedKey={value}
      onSelectionChange={(key) => {
        setInput(null);
        onChange(key ? String(key) : null);
      }}
    >
      <Label className="sr-only">Group</Label>
      <ComboBox.InputGroup>
        <Input placeholder="All groups" />
        {/* InputGroup injects slot props into every child; only Input and Trigger accept them. */}
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox
          items={withSelected}
          renderEmptyState={() => (
            <div className="px-3 py-2 text-sm text-muted">
              {results.isFetching
                ? "Searching…"
                : results.isError
                  ? "Could not search groups."
                  : "No groups start with that name."}
            </div>
          )}
        >
          {(group) => (
            <ListBox.Item id={group.id} textValue={group.name}>
              <div className="flex flex-col">
                <span>{group.name}</span>
                {group.village ? <span className="text-xs text-muted">{group.village}</span> : null}
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}
