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

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function DashboardResumo() {
  const hoje = new Date();
  const [tipoPeriodo, setTipoPeriodo] = useState<"mes" | "tudo">("mes");
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const query =
    tipoPeriodo === "tudo" ? "?periodo=tudo" : `?mes=${mes}&ano=${ano}`;

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    api
      .get<DashboardStats>(`/api/dashboard${query}`)
      .then((s) => {
        if (ativo) setStats(s);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [query]);

  const tiles: { label: string; valor: string | number; cor?: string }[] = stats
    ? [
        { label: "Protocolos ativos", valor: stats.totalAtivos },
        { label: "Vencendo em 7 dias", valor: stats.vencendoEstaSemana, cor: CORES.warning },
        { label: "Vencidos", valor: stats.vencidos, cor: CORES.critical },
        {
          label: "Parados sem movimentação",
          valor: stats.paradosSemMovimentacao,
          cor: CORES.serious,
        },
        { label: "Abertos no período", valor: stats.abertosNoPeriodo },
        { label: "Concluídos no período", valor: stats.concluidosNoPeriodo, cor: CORES.good },
        {
          label: "Tempo médio de conclusão",
          valor:
            stats.tempoMedioConclusaoDias != null ? `${stats.tempoMedioConclusaoDias} d` : "—",
        },
      ]
    : [];

  const maxPorStatus = stats ? Math.max(1, ...stats.porStatus.map((s) => s.total)) : 1;
  const maxPorOrgao = stats ? Math.max(1, ...stats.porOrgao.map((o) => o.total)) : 1;

  const anos = Array.from({ length: 5 }, (_, i) => hoje.getFullYear() - 3 + i);

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Período
          </span>
          <select
            value={mes}
            onChange={(e) => {
              setMes(Number(e.target.value));
              setTipoPeriodo("mes");
            }}
            className={`rounded-md border px-2 py-1 text-sm outline-none ${
              tipoPeriodo === "tudo"
                ? "border-slate-200 text-slate-400"
                : "border-slate-300 text-slate-900"
            }`}
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => {
              setAno(Number(e.target.value));
              setTipoPeriodo("mes");
            }}
            className={`rounded-md border px-2 py-1 text-sm outline-none ${
              tipoPeriodo === "tudo"
                ? "border-slate-200 text-slate-400"
                : "border-slate-300 text-slate-900"
            }`}
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setTipoPeriodo((t) => (t === "tudo" ? "mes" : "tudo"))}
            title={tipoPeriodo === "tudo" ? "Voltar a filtrar por mês" : "Ver todo o histórico"}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
              tipoPeriodo === "tudo"
                ? "border-accent bg-accent text-white"
                : "border-slate-300 text-slate-600 hover:border-accent hover:text-accent"
            }`}
          >
            {tipoPeriodo === "tudo" ? "✕ Todo o período" : "Todo o período"}
          </button>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/dashboard/export${query}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-accent hover:text-accent"
          >
            Baixar Excel
          </a>
          <a
            href={`/api/dashboard/export/pdf${query}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-accent hover:text-accent"
          >
            Baixar PDF
          </a>
        </div>
      </div>

      {loading || !stats ? (
        <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">
            {stats.periodoLabel} · atualizado em {new Date(stats.geradoEm).toLocaleString("pt-BR")}
          </p>

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
                <p className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">
                  {t.valor}
                </p>
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
              itens={stats.porOrgao.map((o) => ({
                nome: o.nome,
                total: o.total,
                cor: CORES.accent,
              }))}
              max={maxPorOrgao}
              vazio="Nenhum protocolo ativo."
            />
          </div>
        </>
      )}
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
