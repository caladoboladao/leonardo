"use client";

import { useState } from "react";

export function InlineText({
  value,
  placeholder,
  onSave,
  className,
}: {
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={`w-full truncate rounded px-1.5 py-1 text-left hover:bg-slate-100 ${className ?? ""}`}
      >
        {value || <span className="text-slate-400">{placeholder ?? "—"}</span>}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) onSave(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm outline-none"
    />
  );
}

export function InlineNumber({
  value,
  placeholder,
  onSave,
}: {
  value: number | null;
  placeholder?: string;
  onSave: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState(value?.toString() ?? "");
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value?.toString() ?? "");
          setEditing(true);
        }}
        className="w-full truncate rounded px-1.5 py-1 text-left hover:bg-slate-100"
      >
        {value ?? <span className="text-slate-400">{placeholder ?? "—"}</span>}
      </button>
    );
  }

  return (
    <input
      autoFocus
      type="number"
      min={0}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        const parsed = draft === "" ? null : Number(draft);
        if (parsed !== value) onSave(parsed);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setEditing(false);
      }}
      className="w-full rounded border border-slate-300 px-1.5 py-1 text-sm outline-none"
    />
  );
}

export function InlineDate({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (value: string) => void;
}) {
  return (
    <input
      type="date"
      value={value ? value.slice(0, 10) : ""}
      onChange={(e) => {
        if (e.target.value) onSave(e.target.value);
      }}
      className="w-full rounded border border-transparent px-1.5 py-1 text-sm hover:border-slate-300 focus:border-slate-400 outline-none"
    />
  );
}

export function InlineSelect({
  value,
  options,
  placeholder,
  onSave,
}: {
  value: string | null;
  options: { id: string; nome: string }[];
  placeholder?: string;
  onSave: (value: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onSave(e.target.value || null)}
      className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm hover:border-slate-300 focus:border-slate-400 outline-none"
    >
      <option value="">{placeholder ?? "—"}</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.nome}
        </option>
      ))}
    </select>
  );
}
