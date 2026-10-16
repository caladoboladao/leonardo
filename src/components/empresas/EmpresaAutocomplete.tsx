"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { EmpresaOption } from "@/lib/types";

export function EmpresaAutocomplete({
  value,
  onChange,
  selectedId,
  onSelect,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (empresa: EmpresaOption | null) => void;
  required?: boolean;
}) {
  const [opcoes, setOpcoes] = useState<EmpresaOption[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value.trim()) {
      setOpcoes([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .get<EmpresaOption[]>(`/api/empresas?q=${encodeURIComponent(value.trim())}`)
        .then(setOpcoes)
        .catch(() => setOpcoes([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const semCorrespondencia =
    !selectedId &&
    value.trim().length > 0 &&
    !opcoes.some((o) => o.razaoSocial.toLowerCase() === value.trim().toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      <input
        required={required}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onSelect(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        placeholder="Buscar empresa existente ou digitar uma nova"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
      />
      {open && opcoes.length > 0 && (
        <ul className="absolute z-40 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {opcoes.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.razaoSocial);
                  onSelect(o);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                {o.razaoSocial}
                {o.cnpj && <span className="ml-1 text-xs text-slate-400">{o.cnpj}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {semCorrespondencia && (
        <p className="mt-1 text-xs text-slate-400">
          Nenhuma empresa encontrada — uma nova será criada ao salvar.
        </p>
      )}
    </div>
  );
}
