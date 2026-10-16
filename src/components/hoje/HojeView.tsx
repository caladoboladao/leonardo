"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { ExigenciaComProtocolo, HojeSummary, ProtocoloListItem, Tarefa } from "@/lib/types";

export function HojeView() {
  const [dados, setDados] = useState<HojeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const resultado = await api.get<HojeSummary>("/api/hoje");
      setDados(resultado);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function concluirTarefa(id: string) {
    await api.patch(`/api/tarefas/${id}`, { concluida: true });
    setDados((prev) =>
      prev
        ? {
            ...prev,
            tarefasVencidas: prev.tarefasVencidas.filter((t) => t.id !== id),
            tarefasHoje: prev.tarefasHoje.filter((t) => t.id !== id),
          }
        : prev
    );
  }

  async function resolverLembrete(id: string) {
    await api.patch(`/api/lembretes/${id}`, { status: "RESOLVIDO" });
    setDados((prev) =>
      prev
        ? { ...prev, lembretesPendentes: prev.lembretesPendentes.filter((l) => l.id !== id) }
        : prev
    );
  }

  if (loading || !dados) {
    return <p className="text-sm text-slate-500">Carregando...</p>;
  }

  const totalVencidos =
    dados.tarefasVencidas.length + dados.protocolosVencidos.length + dados.exigenciasVencidas.length;
  const totalHoje =
    dados.tarefasHoje.length + dados.protocolosHoje.length + dados.exigenciasHoje.length;
  const tudoEmDia = totalVencidos === 0 && totalHoje === 0 && dados.lembretesPendentes.length === 0;

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Hoje</h1>
      <p className="mb-4 text-sm text-slate-500">
        {new Date().toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      </p>

      {tudoEmDia ? (
        <p className="text-sm text-slate-500">Tudo em dia por aqui. 🎉</p>
      ) : (
        <div className="space-y-6">
          {totalVencidos > 0 && (
            <Secao
              titulo="Vencidos"
              corClasse="border-red-200 bg-red-50"
              tarefas={dados.tarefasVencidas}
              protocolos={dados.protocolosVencidos}
              exigencias={dados.exigenciasVencidas}
              onConcluirTarefa={concluirTarefa}
            />
          )}

          {totalHoje > 0 && (
            <Secao
              titulo="Para hoje"
              corClasse="border-amber-200 bg-amber-50"
              tarefas={dados.tarefasHoje}
              protocolos={dados.protocolosHoje}
              exigencias={dados.exigenciasHoje}
              onConcluirTarefa={concluirTarefa}
            />
          )}

          {dados.lembretesPendentes.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                Lembretes pendentes ({dados.lembretesPendentes.length})
              </h2>
              <ul className="space-y-1.5">
                {dados.lembretesPendentes.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/?protocolo=${l.protocolo.id}`}
                        className="text-sm font-medium text-slate-700 hover:underline"
                      >
                        {l.protocolo.empresa}
                        {l.protocolo.numeroProtocolo ? ` (${l.protocolo.numeroProtocolo})` : ""}
                      </Link>
                      <p className="truncate text-sm text-slate-600">{l.nota}</p>
                    </div>
                    <button
                      onClick={() => resolverLembrete(l.id)}
                      className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Resolver
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Secao({
  titulo,
  corClasse,
  tarefas,
  protocolos,
  exigencias,
  onConcluirTarefa,
}: {
  titulo: string;
  corClasse: string;
  tarefas: Tarefa[];
  protocolos: ProtocoloListItem[];
  exigencias: ExigenciaComProtocolo[];
  onConcluirTarefa: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-900">
        {titulo} ({tarefas.length + protocolos.length + exigencias.length})
      </h2>
      <ul className="space-y-1.5">
        {tarefas.map((t) => (
          <li
            key={`t-${t.id}`}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${corClasse}`}
          >
            <input
              type="checkbox"
              className="mt-1"
              onChange={() => onConcluirTarefa(t.id)}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{t.titulo}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {t.prazo && <span>Prazo: {new Date(t.prazo).toLocaleDateString("pt-BR")}</span>}
                {t.protocolo && (
                  <Link href={`/?protocolo=${t.protocolo.id}`} className="hover:underline">
                    {t.protocolo.empresa}
                  </Link>
                )}
                {!t.protocolo && t.empresa && (
                  <Link href={`/empresas/${t.empresa.id}`} className="hover:underline">
                    {t.empresa.razaoSocial}
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
        {protocolos.map((p) => (
          <li
            key={`p-${p.id}`}
            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${corClasse}`}
          >
            <div className="min-w-0">
              <Link
                href={`/?protocolo=${p.id}`}
                className="block truncate text-sm font-medium text-slate-800 hover:underline"
              >
                {p.empresa}
                {p.numeroProtocolo ? ` (${p.numeroProtocolo})` : ""}
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white"
                  style={{ backgroundColor: p.status.cor }}
                >
                  {p.status.nome}
                </span>
                {p.dataVencimento && (
                  <span>Vencimento: {new Date(p.dataVencimento).toLocaleDateString("pt-BR")}</span>
                )}
              </div>
            </div>
          </li>
        ))}
        {exigencias.map((ex) => {
          const prazoFinal = new Date(ex.dataRecebimento);
          prazoFinal.setDate(prazoFinal.getDate() + ex.prazoCumprimento);
          return (
            <li
              key={`ex-${ex.id}`}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${corClasse}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">Exigência: {ex.descricao}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Prazo: {prazoFinal.toLocaleDateString("pt-BR")}</span>
                  <Link href={`/?protocolo=${ex.protocolo.id}`} className="hover:underline">
                    {ex.protocolo.empresa}
                    {ex.protocolo.numeroProtocolo ? ` (${ex.protocolo.numeroProtocolo})` : ""}
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
