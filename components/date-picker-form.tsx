"use client";

import { useRef } from "react";

type Props = {
  label: string;
  date: string;
  submitLabel?: string;
  hiddenFields?: Array<{ name: string; value: string }>;
};

export function DatePickerForm({ label, date, submitLabel = "Load Date", hiddenFields = [] }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  }

  return (
    <form method="GET">
      {hiddenFields.map((field) => (
        <input key={`${field.name}:${field.value}`} type="hidden" name={field.name} value={field.value} />
      ))}
      <label>
        {label}
        <div onClick={openPicker} style={{ cursor: "pointer" }}>
          <input ref={inputRef} type="date" name="date" defaultValue={date} />
        </div>
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
