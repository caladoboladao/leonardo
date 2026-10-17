"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  ProtocoloListItem,
  STATUS_TAREFA_LABEL,
  StatusTarefa,
  Tarefa,
} from "@/lib/types";
import { InlineText, InlineDate } from "@/components/protocolos/InlineEditors";
import { ProtocoloAutocomplete } from "@/components/protocolos/ProtocoloAutocomplete";

const STATUS_COR: Record<StatusTarefa, string> = {
  A_FAZER: "#94a3b8",
  EM_ANDAMENTO: "#f59e0b",
  CONCLUIDA: "#16a34a",
};

export function TarefaPanel({
  tarefaId,
  onClose,
  onChanged,
  onDeleted,
}: {
  tarefaId: string;
  onClose: () => void;
  onChanged: (t: Tarefa) => void;
  onDeleted: (id: string) => void;
}) {
  const [tarefa, setTarefa] = useState<Tarefa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Tarefa>(`/api/tarefas/${tarefaId}`)
      .then(setTarefa)
      .finally(() => setLoading(false));
  }, [tarefaId]);

  async function atualizar(data: Record<string, unknown>) {
    const atualizada = await api.patch<Tarefa>(`/api/tarefas/${tarefaId}`, data);
    setTarefa(atualizada);
    onChanged(atualizada);
  }

  async function excluir() {
    if (!confirm("Excluir esta tarefa?")) return;
    await api.delete(`/api/tarefas/${tarefaId}`);
    onDeleted(tarefaId);
  }

  async function vincularProtocolo(p: ProtocoloListItem) {
    await atualizar({ protocoloId: p.id });
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/20">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Detalhes da tarefa</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {loading || !tarefa ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : (
          <>
            <section className="mb-6 space-y-3">
              <div>
                <span className="text-xs font-medium uppercase text-slate-500">Título</span>
                <InlineText
                  value={tarefa.titulo}
                  onSave={(v) => atualizar({ titulo: v })}
                  className="text-base font-medium"
                />
              </div>

              <div>
                <span className="text-xs font-medium uppercase text-slate-500">Status</span>
                <div className="mt-1 flex gap-1.5">
                  {(Object.keys(STATUS_TAREFA_LABEL) as StatusTarefa[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => atualizar({ status: s })}
                      className="rounded-full px-2.5 py-1 text-xs font-medium text-white transition-opacity"
                      style={{
                        backgroundColor: STATUS_COR[s],
                        opacity: tarefa.status === s ? 1 : 0.35,
                      }}
                    >
                      {STATUS_TAREFA_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-medium uppercase text-slate-500">Prazo</span>
                  <InlineDate
                    value={tarefa.prazo}
                    onSave={(v) => atualizar({ prazo: v })}
                  />
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Responsável
                  </span>
                  <InlineText
                    value={tarefa.responsavel ?? ""}
                    placeholder="—"
                    onSave={(v) => atualizar({ responsavel: v || null })}
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-medium uppercase text-slate-500">Descrição</span>
                <textarea
                  defaultValue={tarefa.descricao ?? ""}
                  onBlur={(e) => {
                    if (e.target.value !== (tarefa.descricao ?? "")) {
                      atualizar({ descricao: e.target.value || null });
                    }
                  }}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
                />
              </div>
            </section>

            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Protocolo vinculado</h3>
              {tarefa.protocolo ? (
                <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <Link
                    href={`/?protocolo=${tarefa.protocolo.id}`}
                    className="truncate text-sm font-medium text-accent hover:underline"
                  >
                    {tarefa.protocolo.empresa}
                    {tarefa.protocolo.numeroProtocolo
                      ? ` (${tarefa.protocolo.numeroProtocolo})`
                      : ""}
                  </Link>
                  <button
                    type="button"
                    onClick={() => atualizar({ protocoloId: null })}
                    className="shrink-0 text-xs text-slate-400 hover:text-red-600"
                  >
                    Desvincular
                  </button>
                </div>
              ) : (
                <ProtocoloAutocomplete onSelect={vincularProtocolo} />
              )}
            </section>

            {tarefa.empresa && !tarefa.protocolo && (
              <section className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Empresa vinculada</h3>
                <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <Link
                    href={`/empresas/${tarefa.empresa.id}`}
                    className="truncate text-sm font-medium text-accent hover:underline"
                  >
                    {tarefa.empresa.razaoSocial}
                  </Link>
                  <button
                    type="button"
                    onClick={() => atualizar({ empresaId: null })}
                    className="shrink-0 text-xs text-slate-400 hover:text-red-600"
                  >
                    Desvincular
                  </button>
                </div>
              </section>
            )}

            <section className="mb-6 text-xs text-slate-500">
              <p>Origem: {tarefa.origem === "MODELO" ? "Gerada automaticamente" : "Manual"}</p>
              <p>Criada em {new Date(tarefa.createdAt).toLocaleString("pt-BR")}</p>
              {tarefa.dataConclusao && (
                <p>Concluída em {new Date(tarefa.dataConclusao).toLocaleString("pt-BR")}</p>
              )}
            </section>

            <button onClick={excluir} className="text-sm text-red-600 hover:underline">
              Excluir tarefa
            </button>
          </>
        )}
      </div>
    </div>
  );
}
