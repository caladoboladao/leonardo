"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { DashboardStats } from "@/lib/types";

const CORES = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  accent: "#2a78d6",
};

export function DashboardResumo() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    api
      .get<DashboardStats>("/api/dashboard")
      .then((s) => {
        if (ativo) setStats(s);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-6 h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />
    );
  }
  if (!stats) return null;

  const tiles: { label: string; valor: string | number; cor?: string }[] = [
    { label: "Protocolos ativos", valor: stats.totalAtivos },
    { label: "Vencendo em 7 dias", valor: stats.vencendoEstaSemana, cor: CORES.warning },
    { label: "Vencidos", valor: stats.vencidos, cor: CORES.critical },
    {
      label: "Parados sem movimentação",
      valor: stats.paradosSemMovimentacao,
      cor: CORES.serious,
    },
    { label: "Abertos no mês", valor: stats.abertosNoMes },
    { label: "Concluídos no mês", valor: stats.concluidosNoMes, cor: CORES.good },
    {
      label: "Tempo médio de conclusão",
      valor: stats.tempoMedioConclusaoDias != null ? `${stats.tempoMedioConclusaoDias} d` : "—",
    },
  ];

  const maxPorStatus = Math.max(1, ...stats.porStatus.map((s) => s.total));
  const maxPorOrgao = Math.max(1, ...stats.porOrgao.map((o) => o.total));

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Atualizado em {new Date(stats.geradoEm).toLocaleString("pt-BR")}
        </p>
        <div className="flex gap-2">
          <a
            href="/api/dashboard/export"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-accent hover:text-accent"
          >
            Baixar Excel
          </a>
          <a
            href="/api/dashboard/export/pdf"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-accent hover:text-accent"
          >
            Baixar PDF
          </a>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5"
            style={t.cor ? { borderLeft: `3px solid ${t.cor}` } : undefined}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {t.label}
            </p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">{t.valor}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <BarList
          titulo="Ativos por status"
          itens={stats.porStatus.map((s) => ({ nome: s.nome, total: s.total, cor: s.cor }))}
          max={maxPorStatus}
          vazio="Nenhum protocolo ativo."
        />
        <BarList
          titulo="Ativos por órgão"
          itens={stats.porOrgao.map((o) => ({ nome: o.nome, total: o.total, cor: CORES.accent }))}
          max={maxPorOrgao}
          vazio="Nenhum protocolo ativo."
        />
      </div>
    </div>
  );
}

function BarList({
  titulo,
  itens,
  max,
  vazio,
}: {
  titulo: string;
  itens: { nome: string; total: number; cor: string }[];
  max: number;
  vazio: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </h3>
      {itens.length === 0 ? (
        <p className="text-sm text-slate-400">{vazio}</p>
      ) : (
        <ul className="space-y-1.5">
          {itens.map((item) => (
            <li key={item.nome} className="flex items-center gap-2" title={`${item.nome}: ${item.total}`}>
              <span className="w-28 shrink-0 truncate text-xs text-slate-600">{item.nome}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.max(6, (item.total / max) * 100)}%`,
                    backgroundColor: item.cor,
                  }}
                />
              </span>
              <span className="w-5 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">
                {item.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
