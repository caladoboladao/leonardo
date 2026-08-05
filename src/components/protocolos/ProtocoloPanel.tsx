"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import {
  Lembrete,
  OrgaoOption,
  ORIGEM_LABEL,
  ProtocoloDetail,
  ProtocoloListItem,
  StatusOption,
  TipoAtoOption,
} from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { InlineText, InlineNumber, InlineSelect } from "./InlineEditors";

export function ProtocoloPanel({
  protocoloId,
  statusOptions,
  orgaoOptions,
  tipoAtoOptions,
  onClose,
  onChanged,
  onDeleted,
}: {
  protocoloId: string;
  statusOptions: StatusOption[];
  orgaoOptions: OrgaoOption[];
  tipoAtoOptions: TipoAtoOption[];
  onClose: () => void;
  onChanged: (p: ProtocoloListItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [detalhe, setDetalhe] = useState<ProtocoloDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [novaNota, setNovaNota] = useState("");
  const [enviandoNota, setEnviandoNota] = useState(false);
  const [novoVinculado, setNovoVinculado] = useState("");
  const [enviandoVinculado, setEnviandoVinculado] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<ProtocoloDetail>(`/api/protocolos/${protocoloId}`)
      .then(setDetalhe)
      .finally(() => setLoading(false));
  }, [protocoloId]);

  async function atualizar(data: Record<string, unknown>) {
    const atualizado = await api.patch<ProtocoloDetail>(
      `/api/protocolos/${protocoloId}`,
      data
    );
    setDetalhe((prev) => (prev ? { ...prev, ...atualizado } : prev));
    onChanged(atualizado);
  }

  async function adicionarLembrete(e: FormEvent) {
    e.preventDefault();
    if (!novaNota.trim()) return;
    setEnviandoNota(true);
    try {
      const lembrete = await api.post<Lembrete>(
        `/api/protocolos/${protocoloId}/lembretes`,
        { nota: novaNota }
      );
      setDetalhe((prev) =>
        prev ? { ...prev, lembretes: [lembrete, ...prev.lembretes] } : prev
      );
      setNovaNota("");
    } finally {
      setEnviandoNota(false);
    }
  }

  async function alternarStatusLembrete(l: Lembrete) {
    const novoStatus = l.status === "PENDENTE" ? "RESOLVIDO" : "PENDENTE";
    const atualizado = await api.patch<Lembrete>(`/api/lembretes/${l.id}`, {
      status: novoStatus,
    });
    setDetalhe((prev) =>
      prev
        ? {
            ...prev,
            lembretes: prev.lembretes.map((x) => (x.id === l.id ? atualizado : x)),
          }
        : prev
    );
  }

  async function excluirLembrete(id: string) {
    await api.delete(`/api/lembretes/${id}`);
    setDetalhe((prev) =>
      prev ? { ...prev, lembretes: prev.lembretes.filter((x) => x.id !== id) } : prev
    );
  }

  async function adicionarVinculado(e: FormEvent) {
    e.preventDefault();
    if (!novoVinculado.trim() || !detalhe) return;
    setEnviandoVinculado(true);
    try {
      const numeros = [
        ...detalhe.protocolosVinculados.map((p) => p.numero),
        novoVinculado.trim(),
      ];
      await atualizar({ protocolosVinculados: numeros });
      setNovoVinculado("");
    } finally {
      setEnviandoVinculado(false);
    }
  }

  async function removerVinculado(numero: string) {
    if (!detalhe) return;
    const numeros = detalhe.protocolosVinculados
      .map((p) => p.numero)
      .filter((n) => n !== numero);
    await atualizar({ protocolosVinculados: numeros });
  }

  async function excluirProtocolo() {
    if (!confirm("Excluir este protocolo e todo o seu histórico/lembretes?")) return;
    await api.delete(`/api/protocolos/${protocoloId}`);
    onDeleted(protocoloId);
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/20">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Detalhes do protocolo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {loading || !detalhe ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : (
          <>
            <section className="mb-6 space-y-3">
              <div>
                <span className="text-xs font-medium uppercase text-slate-500">Empresa</span>
                <InlineText
                  value={detalhe.empresa}
                  onSave={(v) => atualizar({ empresa: v })}
                />
              </div>

              {detalhe.empresasVinculadas.length > 0 && (
                <div>
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Empresas vinculadas
                  </span>
                  <p className="text-sm text-slate-700">
                    {detalhe.empresasVinculadas.map((e) => e.nome).join(", ")}
                  </p>
                </div>
              )}

              <div>
                <span className="text-xs font-medium uppercase text-slate-500">Status</span>
                <div className="mt-1">
                  <StatusPill
                    status={detalhe.status}
                    options={statusOptions}
                    onChange={(statusId) => atualizar({ statusId })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Nº protocolo
                  </span>
                  <InlineText
                    value={detalhe.numeroProtocolo ?? ""}
                    onSave={(v) => atualizar({ numeroProtocolo: v })}
                  />
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-slate-500">CNPJ</span>
                  <InlineText
                    value={detalhe.cnpj ?? ""}
                    onSave={(v) => atualizar({ cnpj: v })}
                  />
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Responsável
                  </span>
                  <InlineText
                    value={detalhe.clienteResponsavel ?? ""}
                    onSave={(v) => atualizar({ clienteResponsavel: v })}
                  />
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-slate-500">Órgão</span>
                  <InlineSelect
                    value={detalhe.orgaoId}
                    options={orgaoOptions}
                    onSave={(v) => atualizar({ orgaoId: v })}
                  />
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Tipo de ato
                  </span>
                  <InlineSelect
                    value={detalhe.tipoAtoId}
                    options={tipoAtoOptions}
                    onSave={(v) => atualizar({ tipoAtoId: v })}
                  />
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Data início
                  </span>
                  <p className="px-1.5 py-1 text-sm">
                    {new Date(detalhe.dataInicio).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Prazo (dias)
                  </span>
                  <InlineNumber
                    value={detalhe.prazoDias}
                    onSave={(v) => atualizar({ prazoDias: v })}
                  />
                </div>
              </div>

              {detalhe.dataVencimento && (
                <div>
                  <span className="text-xs font-medium uppercase text-slate-500">
                    Vencimento
                  </span>
                  <p className="text-sm font-medium text-slate-700">
                    {new Date(detalhe.dataVencimento).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}

              <div>
                <span className="text-xs font-medium uppercase text-slate-500">
                  Observações
                </span>
                <textarea
                  defaultValue={detalhe.observacoes ?? ""}
                  onBlur={(e) => {
                    if (e.target.value !== (detalhe.observacoes ?? "")) {
                      atualizar({ observacoes: e.target.value });
                    }
                  }}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
                />
              </div>
            </section>

            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Protocolos vinculados</h3>
              <p className="mb-2 text-xs text-slate-500">
                Ex.: protocolos de filiais anexados a este protocolo matriz. Não aparecem na
                planilha principal.
              </p>
              <form onSubmit={adicionarVinculado} className="mb-3 flex gap-2">
                <input
                  value={novoVinculado}
                  onChange={(e) => setNovoVinculado(e.target.value)}
                  placeholder="Nº do protocolo vinculado..."
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={enviandoVinculado}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
                >
                  Adicionar
                </button>
              </form>

              {detalhe.protocolosVinculados.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum protocolo vinculado ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {detalhe.protocolosVinculados.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                    >
                      {p.numero}
                      <button
                        type="button"
                        onClick={() => removerVinculado(p.numero)}
                        className="text-slate-400 hover:text-red-600"
                        title="Remover"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Lembretes</h3>
              <form onSubmit={adicionarLembrete} className="mb-3 flex gap-2">
                <input
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                  placeholder="Novo lembrete..."
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={enviandoNota}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
                >
                  Adicionar
                </button>
              </form>

              <ul className="space-y-2">
                {detalhe.lembretes.length === 0 && (
                  <p className="text-sm text-slate-400">Nenhum lembrete ainda.</p>
                )}
                {detalhe.lembretes.map((l) => (
                  <li
                    key={l.id}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      l.status === "PENDENTE"
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {ORIGEM_LABEL[l.origem]} ·{" "}
                        {new Date(l.dataHora).toLocaleString("pt-BR")}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => alternarStatusLembrete(l)}
                          className="font-medium text-slate-600 hover:underline"
                        >
                          {l.status === "PENDENTE" ? "Marcar resolvido" : "Reabrir"}
                        </button>
                        <button
                          onClick={() => excluirLembrete(l.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                    <p
                      className={
                        l.status === "RESOLVIDO" ? "text-slate-500 line-through" : "text-slate-800"
                      }
                    >
                      {l.nota}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Histórico de status</h3>
              <ul className="space-y-1 text-sm text-slate-600">
                {detalhe.historicoStatus.map((h) => (
                  <li key={h.id}>
                    {new Date(h.changedAt).toLocaleString("pt-BR")} —{" "}
                    {h.statusAnterior ? `${h.statusAnterior.nome} → ` : "Criado como "}
                    <strong>{h.statusNovo.nome}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <button
              onClick={excluirProtocolo}
              className="text-sm text-red-600 hover:underline"
            >
              Excluir protocolo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
