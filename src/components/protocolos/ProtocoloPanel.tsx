"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  Exigencia,
  Lancamento,
  Lembrete,
  OrgaoOption,
  ORIGEM_LABEL,
  ProtocoloDetail,
  ProtocoloListItem,
  SITUACAO_LANCAMENTO_LABEL,
  SituacaoLancamento,
  StatusOption,
  Tarefa,
  TipoAtoOption,
  TipoLancamento,
} from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { InlineText, InlineNumber, InlineSelect } from "./InlineEditors";
import { formatCnpj } from "@/lib/format";

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
  const [novaTarefa, setNovaTarefa] = useState("");
  const [enviandoTarefa, setEnviandoTarefa] = useState(false);
  const [novaExigencia, setNovaExigencia] = useState("");
  const [novoPrazoExigencia, setNovoPrazoExigencia] = useState("30");
  const [enviandoExigencia, setEnviandoExigencia] = useState(false);
  const [novoLancTipo, setNovoLancTipo] = useState<TipoLancamento>("TAXA");
  const [novoLancDescricao, setNovoLancDescricao] = useState("");
  const [novoLancValor, setNovoLancValor] = useState("");
  const [enviandoLancamento, setEnviandoLancamento] = useState(false);

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

  async function adicionarTarefa(e: FormEvent) {
    e.preventDefault();
    if (!novaTarefa.trim()) return;
    setEnviandoTarefa(true);
    try {
      const tarefa = await api.post<Tarefa>("/api/tarefas", {
        titulo: novaTarefa,
        protocoloId,
      });
      setDetalhe((prev) =>
        prev ? { ...prev, tarefas: [...prev.tarefas, tarefa] } : prev
      );
      setNovaTarefa("");
    } finally {
      setEnviandoTarefa(false);
    }
  }

  async function alternarTarefa(t: Tarefa) {
    const atualizada = await api.patch<Tarefa>(`/api/tarefas/${t.id}`, {
      concluida: !t.concluida,
    });
    setDetalhe((prev) =>
      prev
        ? { ...prev, tarefas: prev.tarefas.map((x) => (x.id === t.id ? atualizada : x)) }
        : prev
    );
  }

  async function excluirTarefa(id: string) {
    await api.delete(`/api/tarefas/${id}`);
    setDetalhe((prev) =>
      prev ? { ...prev, tarefas: prev.tarefas.filter((x) => x.id !== id) } : prev
    );
  }

  async function adicionarExigencia(e: FormEvent) {
    e.preventDefault();
    if (!novaExigencia.trim()) return;
    setEnviandoExigencia(true);
    try {
      await api.post<Exigencia>(`/api/protocolos/${protocoloId}/exigencias`, {
        descricao: novaExigencia,
        prazoCumprimento: novoPrazoExigencia ? Number(novoPrazoExigencia) : 30,
      });
      // recarrega o protocolo inteiro: abrir uma exigência pode ter mudado
      // o status automaticamente (status "em exigência" configurado)
      const refreshed = await api.get<ProtocoloDetail>(`/api/protocolos/${protocoloId}`);
      setDetalhe(refreshed);
      onChanged(refreshed);
      setNovaExigencia("");
      setNovoPrazoExigencia("30");
    } finally {
      setEnviandoExigencia(false);
    }
  }

  async function marcarExigenciaCumprida(ex: Exigencia) {
    const atualizada = await api.patch<Exigencia>(`/api/exigencias/${ex.id}`, {
      status: ex.status === "CUMPRIDA" ? "ABERTA" : "CUMPRIDA",
    });
    setDetalhe((prev) =>
      prev
        ? { ...prev, exigencias: prev.exigencias.map((x) => (x.id === ex.id ? atualizada : x)) }
        : prev
    );
  }

  async function salvarReprotocolo(id: string, numeroReprotocolo: string) {
    const atualizada = await api.patch<Exigencia>(`/api/exigencias/${id}`, {
      numeroReprotocolo,
    });
    setDetalhe((prev) =>
      prev
        ? { ...prev, exigencias: prev.exigencias.map((x) => (x.id === id ? atualizada : x)) }
        : prev
    );
  }

  async function excluirExigencia(id: string) {
    await api.delete(`/api/exigencias/${id}`);
    setDetalhe((prev) =>
      prev ? { ...prev, exigencias: prev.exigencias.filter((x) => x.id !== id) } : prev
    );
  }

  async function adicionarLancamento(e: FormEvent) {
    e.preventDefault();
    const valorNum = Number(novoLancValor.replace(",", "."));
    if (!novoLancDescricao.trim() || !novoLancValor || Number.isNaN(valorNum)) return;
    setEnviandoLancamento(true);
    try {
      const lancamento = await api.post<Lancamento>(
        `/api/protocolos/${protocoloId}/lancamentos`,
        { tipo: novoLancTipo, descricao: novoLancDescricao, valor: valorNum }
      );
      setDetalhe((prev) =>
        prev ? { ...prev, lancamentos: [lancamento, ...prev.lancamentos] } : prev
      );
      setNovoLancDescricao("");
      setNovoLancValor("");
    } finally {
      setEnviandoLancamento(false);
    }
  }

  async function atualizarSituacaoLancamento(l: Lancamento, situacao: SituacaoLancamento) {
    const atualizado = await api.patch<Lancamento>(`/api/lancamentos/${l.id}`, { situacao });
    setDetalhe((prev) =>
      prev
        ? { ...prev, lancamentos: prev.lancamentos.map((x) => (x.id === l.id ? atualizado : x)) }
        : prev
    );
  }

  async function excluirLancamento(id: string) {
    await api.delete(`/api/lancamentos/${id}`);
    setDetalhe((prev) =>
      prev ? { ...prev, lancamentos: prev.lancamentos.filter((x) => x.id !== id) } : prev
    );
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
                <Link
                  href={`/empresas/${detalhe.empresaId}`}
                  className="block text-sm text-accent hover:underline"
                >
                  {detalhe.empresa}
                </Link>
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
                    onSave={(v) => atualizar({ cnpj: formatCnpj(v) })}
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

              {(detalhe.dataVencimento || detalhe.dataConclusao) && (
                <div className="grid grid-cols-2 gap-3">
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
                  {detalhe.dataConclusao && (
                    <div>
                      <span className="text-xs font-medium uppercase text-slate-500">
                        Data de conclusão
                      </span>
                      <p className="text-sm font-medium text-slate-700">
                        {new Date(detalhe.dataConclusao).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  )}
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
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Tarefas</h3>
              <form onSubmit={adicionarTarefa} className="mb-3 flex gap-2">
                <input
                  value={novaTarefa}
                  onChange={(e) => setNovaTarefa(e.target.value)}
                  placeholder="Nova tarefa..."
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={enviandoTarefa}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
                >
                  Adicionar
                </button>
              </form>

              {detalhe.tarefas.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma tarefa ainda.</p>
              ) : (
                <ul className="space-y-1.5">
                  {detalhe.tarefas.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={t.concluida}
                        onChange={() => alternarTarefa(t)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${
                            t.concluida ? "text-slate-400 line-through" : "text-slate-800"
                          }`}
                        >
                          {t.titulo}
                        </p>
                        {t.prazo && (
                          <p className="text-xs text-slate-500">
                            Prazo: {new Date(t.prazo).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => excluirTarefa(t.id)}
                        className="shrink-0 text-xs text-slate-400 hover:text-red-600"
                      >
                        Excluir
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Exigências</h3>
              <form onSubmit={adicionarExigencia} className="mb-3 flex flex-wrap gap-2">
                <input
                  value={novaExigencia}
                  onChange={(e) => setNovaExigencia(e.target.value)}
                  placeholder="Descrição da exigência..."
                  className="min-w-[160px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={novoPrazoExigencia}
                  onChange={(e) => setNovoPrazoExigencia(e.target.value)}
                  placeholder="Prazo (dias)"
                  className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={enviandoExigencia}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
                >
                  Adicionar
                </button>
              </form>

              {detalhe.exigencias.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhuma exigência registrada.</p>
              ) : (
                <ul className="space-y-2">
                  {detalhe.exigencias.map((ex) => {
                    const prazoFinal = new Date(ex.dataRecebimento);
                    prazoFinal.setDate(prazoFinal.getDate() + ex.prazoCumprimento);
                    return (
                      <li
                        key={ex.id}
                        className={`rounded-md border px-3 py-2 text-sm ${
                          ex.status === "ABERTA"
                            ? "border-amber-200 bg-amber-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p
                            className={
                              ex.status === "CUMPRIDA"
                                ? "text-slate-500 line-through"
                                : "font-medium text-slate-800"
                            }
                          >
                            {ex.descricao}
                          </p>
                          <div className="flex shrink-0 gap-2 text-xs">
                            <button
                              onClick={() => marcarExigenciaCumprida(ex)}
                              className="font-medium text-slate-600 hover:underline"
                            >
                              {ex.status === "ABERTA" ? "Marcar cumprida" : "Reabrir"}
                            </button>
                            <button
                              onClick={() => excluirExigencia(ex.id)}
                              className="text-slate-400 hover:text-red-600"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500">
                          Recebida em {new Date(ex.dataRecebimento).toLocaleDateString("pt-BR")}{" "}
                          · Prazo: {prazoFinal.toLocaleDateString("pt-BR")} ({ex.prazoCumprimento}{" "}
                          dias)
                          {ex.dataCumprimento &&
                            ` · Cumprida em ${new Date(ex.dataCumprimento).toLocaleDateString("pt-BR")}`}
                        </p>
                        <InlineText
                          value={ex.numeroReprotocolo ?? ""}
                          placeholder="Nº do reprotocolo"
                          onSave={(v) => salvarReprotocolo(ex.id, v)}
                          className="mt-1"
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="mb-6">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Taxas e honorários</h3>
              <form onSubmit={adicionarLancamento} className="mb-3 flex flex-wrap items-center gap-2">
                <select
                  value={novoLancTipo}
                  onChange={(e) => setNovoLancTipo(e.target.value as TipoLancamento)}
                  className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
                >
                  <option value="TAXA">Taxa</option>
                  <option value="HONORARIO">Honorário</option>
                </select>
                <input
                  value={novoLancDescricao}
                  onChange={(e) => setNovoLancDescricao(e.target.value)}
                  placeholder="Descrição..."
                  className="min-w-[140px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
                />
                <input
                  value={novoLancValor}
                  onChange={(e) => setNovoLancValor(e.target.value)}
                  placeholder="Valor (R$)"
                  inputMode="decimal"
                  className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={enviandoLancamento}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
                >
                  Adicionar
                </button>
              </form>

              {detalhe.lancamentos.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum lançamento ainda.</p>
              ) : (
                <>
                  <ul className="mb-2 space-y-1.5">
                    {detalhe.lancamentos.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">
                            {l.tipo === "TAXA" ? "Taxa" : "Honorário"} · {l.descricao}
                          </p>
                          <p className="text-xs text-slate-500">
                            {l.valor.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <select
                            value={l.situacao}
                            onChange={(e) =>
                              atualizarSituacaoLancamento(l, e.target.value as SituacaoLancamento)
                            }
                            className="rounded border border-slate-300 px-1.5 py-1 text-xs outline-none"
                          >
                            {(l.tipo === "TAXA"
                              ? (["A_PAGAR", "PAGO"] as SituacaoLancamento[])
                              : (["A_FATURAR", "FATURADO", "RECEBIDO"] as SituacaoLancamento[])
                            ).map((s) => (
                              <option key={s} value={s}>
                                {SITUACAO_LANCAMENTO_LABEL[s]}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => excluirLancamento(l.id)}
                            className="text-xs text-slate-400 hover:text-red-600"
                          >
                            Excluir
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500">
                    Total:{" "}
                    {detalhe.lancamentos
                      .reduce((soma, l) => soma + l.valor, 0)
                      .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </>
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
