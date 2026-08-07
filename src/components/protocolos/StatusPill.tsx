"use client";

import { useState, useRef, useEffect } from "react";
import { StatusOption } from "@/lib/types";

export function StatusPill({
  status,
  options,
  onChange,
}: {
  status: StatusOption;
  options: StatusOption[];
  onChange: (statusId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [abrirParaCima, setAbrirParaCima] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function alternarAbertura() {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const alturaEstimada = Math.min(options.length, 8) * 34 + 12;
      const espacoAbaixo = window.innerHeight - rect.bottom;
      setAbrirParaCima(espacoAbaixo < alturaEstimada && rect.top > espacoAbaixo);
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={alternarAbertura}
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
        style={{ backgroundColor: status.cor }}
      >
        {status.nome}
      </button>
      {open && (
        <div
          className={`absolute z-20 w-52 rounded-md border border-slate-200 bg-white py-1 shadow-lg ${
            abrirParaCima ? "bottom-full mb-1" : "mt-1"
          }`}
        >
          {options
            .slice()
            .sort((a, b) => a.ordem - b.ordem)
            .map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: opt.cor }}
                />
                {opt.nome}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
