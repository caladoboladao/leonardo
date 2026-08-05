"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import {
  OrgaoOption,
  ProtocoloListItem,
  Settings,
  StatusOption,
  TipoAtoOption,
} from "@/lib/types";
import { situacaoVencimento } from "@/lib/vencimento";
import { StatusPill } from "./StatusPill";
import { InlineText, InlineNumber, InlineDate, InlineSelect } from "./InlineEditors";
import { NovoProtocoloDialog } from "./NovoProtocoloDialog";
import { ImportarPlanilhaDialog } from "./ImportarPlanilhaDialog";
import { ProtocoloPanel } from "./ProtocoloPanel";

type SortField =
  | "empresa"
  | "numeroProtocolo"
  | "dataInicio"
  | "dataVencimento"
  | "createdAt";

export function ProtocolosView({
  arquivados,
  initialSelecionadoId,
}: {
  arquivados: boolean;
  initialSelecionadoId?: string;
}) {
  const [protocolos, setProtocolos] = useState<ProtocoloListItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [orgaoOptions, setOrgaoOptions] = useState<OrgaoOption[]>([]);
  const [tipoAtoOptions, setTipoAtoOptions] = useState<TipoAtoOption[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [orgaoFiltro, setOrgaoFiltro] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [selecionadoId, setSelecionadoId] = useState<string | null>(
    initialSelecionadoId ?? null
  );
  const [novoAberto, setNovoAberto] = useState(false);
  const [importarAberto, setImportarAberto] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [protos, status, orgaos, tipos, cfg] = await Promise.all([
        api.get<ProtocoloListItem[]>(`/api/protocolos?arquivados=${arquivados}`),
        api.get<StatusOption[]>("/api/opcoes/status"),
        api.get<OrgaoOption[]>("/api/opcoes/orgaos"),
        api.get<TipoAtoOption[]>("/api/opcoes/tipos-ato"),
        api.get<Settings>("/api/settings"),
      ]);
      setProtocolos(protos);
      setStatusOptions(status);
      setOrgaoOptions(orgaos);
      setTipoAtoOptions(tipos);
      setSettings(cfg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [arquivados]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function atualizarProtocolo(id: string, data: Record<string, unknown>) {
    const atualizado = await api.patch<ProtocoloListItem>(`/api/protocolos/${id}`, data);
    setProtocolos((prev) => {
      const next = prev.map((p) => (p.id === id ? atualizado : p));
      // se o status/arquivamento mudou de forma que o item não pertence mais a esta visão, remove
      if (arquivados !== atualizado.status.isConcluido) {
        return next.filter((p) => p.id !== id);
      }
      return next;
    });
  }

  async function excluirProtocolo(id: string) {
    if (!confirm("Excluir este protocolo e todo o seu histórico/lembretes?")) return;
    await api.delete(`/api/protocolos/${id}`);
    setProtocolos((prev) => prev.filter((p) => p.id !== id));
    setSelecionadoId(null);
  }

  const filtrados = useMemo(() => {
    let lista = protocolos;
    if (q.trim()) {
      const termo = q.trim().toLowerCase();
      lista = lista.filter(
        (p) =>
          p.empresa.toLowerCase().includes(termo) ||
          p.numeroProtocolo?.toLowerCase().includes(termo) ||
          p.clienteResponsavel?.toLowerCase().includes(termo)
      );
    }
    if (statusFiltro) lista = lista.filter((p) => p.statusId === statusFiltro);
    if (orgaoFiltro) lista = lista.filter((p) => p.orgaoId === orgaoFiltro);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...lista].sort((a, b) => {
      const va = a[sortBy] ?? "";
      const vb = b[sortBy] ?? "";
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [protocolos, q, statusFiltro, orgaoFiltro, sortBy, sortDir]);

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  function headerButton(field: SortField, label: string) {
    const ativo = sortBy === field;
    return (
      <button
        type="button"
        onClick={() => toggleSort(field)}
        title="Ordenar"
        className={`flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide hover:text-accent ${
          ativo ? "text-accent" : "text-slate-500"
        }`}
      >
        {label}
        <span className={`text-[10px] leading-none ${ativo ? "" : "text-slate-300"}`}>
          {ativo ? (sortDir === "asc" ? "▲" : "▼") : "▲▼"}
        </span>
      </button>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por empresa, protocolo ou responsável..."
          className="w-72 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <select
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Todos os status</option>
          {statusOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
        <select
          value={orgaoFiltro}
          onChange={(e) => setOrgaoFiltro(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Todos os órgãos</option>
          {orgaoOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        {!arquivados && (
          <>
            <button
              onClick={() => setImportarAberto(true)}
              disabled={loading || statusOptions.length === 0}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-accent hover:text-accent disabled:opacity-50"
            >
              Importar planilha
            </button>
            <button
              onClick={() => setNovoAberto(true)}
              disabled={loading || statusOptions.length === 0}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
            >
              + Novo protocolo
            </button>
          </>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum protocolo encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1500px] border-collapse text-sm [table-layout:fixed]">
            <colgroup>
              <col style={{ width: 230 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 80 }} />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">{headerButton("empresa", "Empresa")}</th>
                <th className="px-3 py-2 text-left">
                  {headerButton("numeroProtocolo", "Nº Protocolo")}
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Órgão
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tipo de ato
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-3 py-2 text-left">{headerButton("dataInicio", "Início")}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Prazo (dias)
                </th>
                <th className="px-3 py-2 text-left">
                  {headerButton("dataVencimento", "Vencimento")}
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Responsável
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Lembretes
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => {
                const situacao = settings
                  ? situacaoVencimento(
                      p.dataVencimento,
                      p.status.isConcluido,
                      settings.diasAlertaPrazo
                    )
                  : null;
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-100 last:border-0 ${
                      situacao === "vencido"
                        ? "bg-red-50"
                        : situacao === "proximo"
                          ? "bg-amber-50"
                          : ""
                    }`}
                  >
                    <td className="px-1 py-1">
                      <button
                        className="w-full truncate rounded px-1.5 py-1 text-left font-medium hover:bg-slate-100"
                        onClick={() => setSelecionadoId(p.id)}
                        title="Abrir detalhes"
                      >
                        {p.empresa}
                      </button>
                    </td>
                    <td className="px-1 py-1">
                      <InlineText
                        value={p.numeroProtocolo ?? ""}
                        placeholder="—"
                        onSave={(v) => atualizarProtocolo(p.id, { numeroProtocolo: v })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <InlineSelect
                        value={p.orgaoId}
                        options={orgaoOptions}
                        onSave={(v) => atualizarProtocolo(p.id, { orgaoId: v })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <InlineSelect
                        value={p.tipoAtoId}
                        options={tipoAtoOptions}
                        onSave={(v) => atualizarProtocolo(p.id, { tipoAtoId: v })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <StatusPill
                        status={p.status}
                        options={statusOptions}
                        onChange={(statusId) => atualizarProtocolo(p.id, { statusId })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <InlineDate
                        value={p.dataInicio}
                        onSave={(v) => atualizarProtocolo(p.id, { dataInicio: v })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <InlineNumber
                        value={p.prazoDias}
                        onSave={(v) => atualizarProtocolo(p.id, { prazoDias: v })}
                      />
                    </td>
                    <td className="px-1 py-1 text-sm">
                      {p.dataVencimento ? (
                        <span
                          className={
                            situacao === "vencido"
                              ? "font-medium text-red-700"
                              : situacao === "proximo"
                                ? "font-medium text-amber-700"
                                : ""
                          }
                        >
                          {new Date(p.dataVencimento).toLocaleDateString("pt-BR")}
                        </span>
                      ) : (
                        <span className="px-1.5 text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-1 py-1">
                      <InlineText
                        value={p.clienteResponsavel ?? ""}
                        placeholder="—"
                        onSave={(v) =>
                          atualizarProtocolo(p.id, { clienteResponsavel: v })
                        }
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      {p._count.lembretes > 0 && (
                        <button
                          onClick={() => setSelecionadoId(p.id)}
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white"
                        >
                          {p._count.lembretes}
                        </button>
                      )}
                    </td>
                    <td className="px-1 py-1 text-right">
                      <button
                        onClick={() => excluirProtocolo(p.id)}
                        className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {novoAberto && (
        <NovoProtocoloDialog
          statusOptions={statusOptions}
          orgaoOptions={orgaoOptions}
          tipoAtoOptions={tipoAtoOptions}
          onClose={() => setNovoAberto(false)}
          onCreated={(p) => {
            setProtocolos((prev) => [p, ...prev]);
            setNovoAberto(false);
          }}
        />
      )}

      {importarAberto && (
        <ImportarPlanilhaDialog
          statusOptions={statusOptions}
          orgaoOptions={orgaoOptions}
          onClose={() => setImportarAberto(false)}
          onImported={carregar}
        />
      )}

      {selecionadoId && (
        <ProtocoloPanel
          protocoloId={selecionadoId}
          statusOptions={statusOptions}
          orgaoOptions={orgaoOptions}
          tipoAtoOptions={tipoAtoOptions}
          onClose={() => setSelecionadoId(null)}
          onChanged={(atualizado) => {
            setProtocolos((prev) => {
              const next = prev.map((p) => (p.id === atualizado.id ? atualizado : p));
              if (arquivados !== atualizado.status.isConcluido) {
                return next.filter((p) => p.id !== atualizado.id);
              }
              return next;
            });
          }}
          onDeleted={(id) => {
            setProtocolos((prev) => prev.filter((p) => p.id !== id));
            setSelecionadoId(null);
          }}
        />
      )}
    </div>
  );
}
