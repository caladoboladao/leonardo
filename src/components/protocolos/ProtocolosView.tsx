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
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aplicandoEmMassa, setAplicandoEmMassa] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [protos, status, orgaos, tipos, cfg] = await Promise.all([
        api.get<ProtocoloListItem[]>(`/api/protocolos?arquivados=all`),
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
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function atualizarProtocolo(id: string, data: Record<string, unknown>) {
    const atualizado = await api.patch<ProtocoloListItem>(`/api/protocolos/${id}`, data);
    setProtocolos((prev) => prev.map((p) => (p.id === id ? atualizado : p)));
  }

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function aplicarEmMassa(data: Record<string, unknown>) {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    setAplicandoEmMassa(true);
    try {
      const atualizados = await Promise.all(
        ids.map((id) => api.patch<ProtocoloListItem>(`/api/protocolos/${id}`, data))
      );
      setProtocolos((prev) => {
        const map = new Map(atualizados.map((a) => [a.id, a]));
        return prev.map((p) => map.get(p.id) ?? p);
      });
      setSelecionados(new Set());
    } finally {
      setAplicandoEmMassa(false);
    }
  }

  async function excluirEmMassa() {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    if (!confirm(`Excluir ${ids.length} protocolo(s) selecionado(s)? Essa ação não pode ser desfeita.`))
      return;
    setAplicandoEmMassa(true);
    try {
      await Promise.all(ids.map((id) => api.delete(`/api/protocolos/${id}`)));
      setProtocolos((prev) => prev.filter((p) => !selecionados.has(p.id)));
      setSelecionados(new Set());
    } finally {
      setAplicandoEmMassa(false);
    }
  }

  const filtrados = useMemo(() => {
    let lista = protocolos;

    if (statusFiltro) {
      // status escolhido explicitamente vale por si só — inclusive pra ver
      // concluídos a partir da tela principal, mesmo ela normalmente
      // escondendo-os.
      lista = lista.filter((p) => p.statusId === statusFiltro);
    } else {
      lista = lista.filter((p) => p.status.isConcluido === arquivados);
    }

    if (q.trim()) {
      const termo = q.trim().toLowerCase();
      lista = lista.filter(
        (p) =>
          p.empresa.toLowerCase().includes(termo) ||
          p.numeroProtocolo?.toLowerCase().includes(termo) ||
          p.clienteResponsavel?.toLowerCase().includes(termo)
      );
    }
    if (orgaoFiltro) lista = lista.filter((p) => p.orgaoId === orgaoFiltro);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...lista].sort((a, b) => {
      const va = a[sortBy] ?? "";
      const vb = b[sortBy] ?? "";
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [protocolos, q, statusFiltro, orgaoFiltro, sortBy, sortDir, arquivados]);

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

      {selecionados.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-sm">
          <span className="font-medium text-accent">
            {selecionados.size} selecionado(s)
          </span>

          <select
            defaultValue=""
            disabled={aplicandoEmMassa}
            onChange={(e) => {
              const v = e.target.value;
              e.target.value = "";
              if (v) aplicarEmMassa({ statusId: v });
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none disabled:opacity-50"
          >
            <option value="" disabled>
              Mudar status para...
            </option>
            {statusOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>

          <select
            defaultValue=""
            disabled={aplicandoEmMassa}
            onChange={(e) => {
              const v = e.target.value;
              e.target.value = "";
              aplicarEmMassa({ orgaoId: v === "__none__" ? null : v });
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none disabled:opacity-50"
          >
            <option value="" disabled>
              Mudar órgão para...
            </option>
            <option value="__none__">—</option>
            {orgaoOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>

          <select
            defaultValue=""
            disabled={aplicandoEmMassa}
            onChange={(e) => {
              const v = e.target.value;
              e.target.value = "";
              aplicarEmMassa({ tipoAtoId: v === "__none__" ? null : v });
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm outline-none disabled:opacity-50"
          >
            <option value="" disabled>
              Mudar tipo de ato para...
            </option>
            <option value="__none__">—</option>
            {tipoAtoOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={excluirEmMassa}
            disabled={aplicandoEmMassa}
            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Excluir selecionados
          </button>

          <button
            type="button"
            onClick={() => setSelecionados(new Set())}
            className="ml-auto text-xs text-slate-500 hover:text-slate-800"
          >
            Limpar seleção
          </button>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum protocolo encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1370px] border-collapse text-sm [table-layout:fixed]">
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 230 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 150 }} />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={filtrados.length > 0 && filtrados.every((p) => selecionados.has(p.id))}
                    ref={(el) => {
                      if (el)
                        el.indeterminate =
                          selecionados.size > 0 &&
                          !filtrados.every((p) => selecionados.has(p.id));
                    }}
                    onChange={(e) => {
                      setSelecionados((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) filtrados.forEach((p) => next.add(p.id));
                        else filtrados.forEach((p) => next.delete(p.id));
                        return next;
                      });
                    }}
                  />
                </th>
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
                    <td className="px-3 py-1">
                      <input
                        type="checkbox"
                        checked={selecionados.has(p.id)}
                        onChange={() => toggleSelecionado(p.id)}
                      />
                    </td>
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
          tipoAtoOptions={tipoAtoOptions}
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
            setProtocolos((prev) =>
              prev.map((p) => (p.id === atualizado.id ? atualizado : p))
            );
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
