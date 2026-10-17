"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { ProtocoloListItem } from "@/lib/types";

export function ProtocoloAutocomplete({
  onSelect,
  placeholder = "Buscar protocolo por empresa, número ou CNPJ...",
}: {
  onSelect: (protocolo: ProtocoloListItem) => void;
  placeholder?: string;
}) {
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<ProtocoloListItem[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!termo.trim()) {
      setOpcoes([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .get<ProtocoloListItem[]>(
          `/api/protocolos?arquivados=all&q=${encodeURIComponent(termo.trim())}`
        )
        .then((lista) => setOpcoes(lista.slice(0, 8)))
        .catch(() => setOpcoes([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [termo]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
      />
      {open && opcoes.length > 0 && (
        <ul className="absolute z-40 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {opcoes.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(p);
                  setTermo("");
                  setOpcoes([]);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium">{p.empresa}</span>
                {p.numeroProtocolo && (
                  <span className="ml-1.5 text-xs text-slate-400">{p.numeroProtocolo}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
