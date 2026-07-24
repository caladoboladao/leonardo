"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { LembreteComProtocolo, ORIGEM_LABEL } from "@/lib/types";

export function LembretesView() {
  const [lembretes, setLembretes] = useState<LembreteComProtocolo[]>([]);
  const [mostrarResolvidos, setMostrarResolvidos] = useState(false);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const status = mostrarResolvidos ? "RESOLVIDO" : "PENDENTE";
    const dados = await api.get<LembreteComProtocolo[]>(`/api/lembretes?status=${status}`);
    setLembretes(dados);
    setLoading(false);
  }, [mostrarResolvidos]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function alternarStatus(l: LembreteComProtocolo) {
    const novoStatus = l.status === "PENDENTE" ? "RESOLVIDO" : "PENDENTE";
    await api.patch(`/api/lembretes/${l.id}`, { status: novoStatus });
    setLembretes((prev) => prev.filter((x) => x.id !== l.id));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">
          Lembretes {mostrarResolvidos ? "resolvidos" : "pendentes"}
        </h1>
        <button
          onClick={() => setMostrarResolvidos((v) => !v)}
          className="text-sm text-slate-500 hover:text-slate-800 hover:underline"
        >
          {mostrarResolvidos ? "Ver pendentes" : "Ver resolvidos"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : lembretes.length === 0 ? (
        <p className="text-sm text-slate-500">
          {mostrarResolvidos ? "Nenhum lembrete resolvido." : "Nenhum lembrete pendente. 🎉"}
        </p>
      ) : (
        <ul className="space-y-2">
          {lembretes.map((l) => (
            <li
              key={l.id}
              className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: l.protocolo.status.cor }}
                  />
                  <Link
                    href={`/?protocolo=${l.protocolo.id}`}
                    className="font-medium text-slate-700 hover:underline"
                  >
                    {l.protocolo.empresa}
                    {l.protocolo.numeroProtocolo ? ` (${l.protocolo.numeroProtocolo})` : ""}
                  </Link>
                  <span>· {ORIGEM_LABEL[l.origem]}</span>
                  <span>· {new Date(l.dataHora).toLocaleString("pt-BR")}</span>
                </div>
                <p className="text-sm text-slate-800">{l.nota}</p>
              </div>
              <button
                onClick={() => alternarStatus(l)}
                className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                {mostrarResolvidos ? "Reabrir" : "Marcar resolvido"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
