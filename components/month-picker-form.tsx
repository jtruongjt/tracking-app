"use client";

import { useRef } from "react";

type Props = {
  label: string;
  month: string;
  submitLabel?: string;
};

export function MonthPickerForm({ label, month, submitLabel = "Load Month" }: Props) {
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
      <label>
        {label}
        <div onClick={openPicker} style={{ cursor: "pointer" }}>
          <input ref={inputRef} type="month" name="month" defaultValue={month} />
        </div>
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
