"use client";

import { useEffect, useRef, useState } from "react";
import { OrgaoOption, StatusOption, TipoAtoOption } from "@/lib/types";

export function FiltrosPopover({
  statusOptions,
  orgaoOptions,
  tipoAtoOptions,
  statusFiltro,
  setStatusFiltro,
  orgaoFiltro,
  setOrgaoFiltro,
  tipoAtoFiltro,
  setTipoAtoFiltro,
  campoData,
  setCampoData,
  dataDe,
  setDataDe,
  dataAte,
  setDataAte,
  filtrosAtivos,
  limparFiltros,
  exportUrl,
  totalFiltrados,
}: {
  statusOptions: StatusOption[];
  orgaoOptions: OrgaoOption[];
  tipoAtoOptions: TipoAtoOption[];
  statusFiltro: string;
  setStatusFiltro: (v: string) => void;
  orgaoFiltro: string;
  setOrgaoFiltro: (v: string) => void;
  tipoAtoFiltro: string;
  setTipoAtoFiltro: (v: string) => void;
  campoData: "dataInicio" | "dataVencimento";
  setCampoData: (v: "dataInicio" | "dataVencimento") => void;
  dataDe: string;
  setDataDe: (v: string) => void;
  dataAte: string;
  setDataAte: (v: string) => void;
  filtrosAtivos: boolean;
  limparFiltros: () => void;
  exportUrl: string;
  totalFiltrados: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const contadorAtivos = [statusFiltro, orgaoFiltro, tipoAtoFiltro, dataDe, dataAte].filter(
    Boolean
  ).length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Filtros"
        className={`relative inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium ${
          filtrosAtivos
            ? "border-accent text-accent"
            : "border-slate-300 text-slate-700 hover:border-accent hover:text-accent"
        }`}
      >
        <IconFiltro className="h-4 w-4" />
        Filtros
        {contadorAtivos > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {contadorAtivos}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
          <div className="space-y-2.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
              >
                <option value="">Todos os status</option>
                {statusOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Órgão</label>
              <select
                value={orgaoFiltro}
                onChange={(e) => setOrgaoFiltro(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
              >
                <option value="">Todos os órgãos</option>
                {orgaoOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Tipo de ato
              </label>
              <select
                value={tipoAtoFiltro}
                onChange={(e) => setTipoAtoFiltro(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
              >
                <option value="">Todos os tipos de ato</option>
                {tipoAtoOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Período</label>
              <select
                value={campoData}
                onChange={(e) =>
                  setCampoData(e.target.value as "dataInicio" | "dataVencimento")
                }
                className="mb-1.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
              >
                <option value="dataInicio">Data de início</option>
                <option value="dataVencimento">Data de vencimento</option>
              </select>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={dataDe}
                  onChange={(e) => setDataDe(e.target.value)}
                  title="De"
                  className="w-full rounded-md border border-slate-300 px-1.5 py-1.5 text-xs outline-none"
                />
                <span className="shrink-0 text-xs text-slate-400">até</span>
                <input
                  type="date"
                  value={dataAte}
                  onChange={(e) => setDataAte(e.target.value)}
                  title="Até"
                  className="w-full rounded-md border border-slate-300 px-1.5 py-1.5 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            {filtrosAtivos ? (
              <button
                type="button"
                onClick={limparFiltros}
                className="text-xs text-slate-500 hover:text-accent hover:underline"
              >
                Limpar filtros
              </button>
            ) : (
              <span />
            )}
            <a
              href={exportUrl}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-dark"
            >
              Baixar Excel ({totalFiltrados})
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function IconFiltro({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M2 3.5h12M4.5 8h7M7 12.5h2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
