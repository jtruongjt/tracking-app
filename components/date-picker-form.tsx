"use client";

import { useRef } from "react";

type Props = {
  label: string;
  date: string;
  hiddenFields?: Array<{ name: string; value: string }>;
};

export function DatePickerForm({ label, date, hiddenFields = [] }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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

  function submitOnDateChange() {
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} method="GET" className="toolbar-form">
      {hiddenFields.map((field) => (
        <input key={`${field.name}:${field.value}`} type="hidden" name={field.name} value={field.value} />
      ))}
      <label>
        {label}
        <div onClick={openPicker} className="toolbar-picker-hitbox">
          <input ref={inputRef} type="date" name="date" defaultValue={date} onChange={submitOnDateChange} />
        </div>
      </label>
    </form>
  );
}
