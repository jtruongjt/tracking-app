"use client";

import { useRef } from "react";

type Props = {
  label: string;
  month: string;
};

export function MonthPickerForm({ label, month }: Props) {
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

  function submitOnMonthChange() {
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} method="GET" className="toolbar-form">
      <label>
        {label}
        <div onClick={openPicker} className="toolbar-picker-hitbox">
          <input ref={inputRef} type="month" name="month" defaultValue={month} onChange={submitOnMonthChange} />
        </div>
      </label>
    </form>
  );
}
