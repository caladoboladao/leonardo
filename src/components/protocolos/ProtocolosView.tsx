"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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
import { FiltrosPopover } from "./FiltrosPopover";

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
  const [tipoAtoFiltro, setTipoAtoFiltro] = useState("");
  const [campoData, setCampoData] = useState<"dataInicio" | "dataVencimento">("dataInicio");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [selecionadoId, setSelecionadoId] = useState<string | null>(
    initialSelecionadoId ?? null
  );
  const [novoAberto, setNovoAberto] = useState(false);
  const [importarAberto, setImportarAberto] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aplicandoEmMassa, setAplicandoEmMassa] = useState(false);
  const { data: session } = useSession();

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
          p.cnpj?.toLowerCase().includes(termo) ||
          p.clienteResponsavel?.toLowerCase().includes(termo)
      );
    }
    if (orgaoFiltro) lista = lista.filter((p) => p.orgaoId === orgaoFiltro);
    if (tipoAtoFiltro) lista = lista.filter((p) => p.tipoAtoId === tipoAtoFiltro);

    if (dataDe || dataAte) {
      lista = lista.filter((p) => {
        const valor = p[campoData];
        if (!valor) return false;
        const dia = valor.slice(0, 10);
        if (dataDe && dia < dataDe) return false;
        if (dataAte && dia > dataAte) return false;
        return true;
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;
    return [...lista].sort((a, b) => {
      const va = a[sortBy] ?? "";
      const vb = b[sortBy] ?? "";
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [
    protocolos,
    q,
    statusFiltro,
    orgaoFiltro,
    tipoAtoFiltro,
    campoData,
    dataDe,
    dataAte,
    sortBy,
    sortDir,
    arquivados,
  ]);

  const totalNaVisao = useMemo(
    () => protocolos.filter((p) => p.status.isConcluido === arquivados).length,
    [protocolos, arquivados]
  );

  const vencendoCount = useMemo(() => {
    if (!settings) return 0;
    return protocolos.filter(
      (p) =>
        situacaoVencimento(p.dataVencimento, p.status.isConcluido, settings.diasAlertaPrazo) ===
        "proximo"
    ).length;
  }, [protocolos, settings]);

  const vencidoCount = useMemo(() => {
    if (!settings) return 0;
    return protocolos.filter(
      (p) =>
        situacaoVencimento(p.dataVencimento, p.status.isConcluido, settings.diasAlertaPrazo) ===
        "vencido"
    ).length;
  }, [protocolos, settings]);

  const primeiroNome = session?.user?.name?.split(" ")[0];
  const saudacao = (() => {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const filtrosAtivos = Boolean(
    q.trim() || statusFiltro || orgaoFiltro || tipoAtoFiltro || dataDe || dataAte
  );

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (statusFiltro) params.set("statusId", statusFiltro);
    if (orgaoFiltro) params.set("orgaoId", orgaoFiltro);
    if (tipoAtoFiltro) params.set("tipoAtoId", tipoAtoFiltro);
    if (dataDe) params.set("dataDe", dataDe);
    if (dataAte) params.set("dataAte", dataAte);
    params.set("campoData", campoData);
    params.set("arquivados", arquivados ? "true" : "false");
    return `/api/protocolos/export?${params.toString()}`;
  }, [q, statusFiltro, orgaoFiltro, tipoAtoFiltro, campoData, dataDe, dataAte, arquivados]);

  function limparFiltros() {
    setQ("");
    setStatusFiltro("");
    setOrgaoFiltro("");
    setTipoAtoFiltro("");
    setDataDe("");
    setDataAte("");
  }

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
      {!arquivados && (
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-slate-900">
            {saudacao}
            {primeiroNome ? `, ${primeiroNome}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {totalNaVisao} protocolo(s) ativo(s)
            {vencendoCount > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="font-medium text-amber-600">
                  {vencendoCount} vencendo em breve
                </span>
              </>
            )}
            {vencidoCount > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="font-medium text-red-600">{vencidoCount} vencido(s)</span>
              </>
            )}
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por empresa, protocolo ou responsável..."
          className="w-72 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <FiltrosPopover
          statusOptions={statusOptions}
          orgaoOptions={orgaoOptions}
          tipoAtoOptions={tipoAtoOptions}
          statusFiltro={statusFiltro}
          setStatusFiltro={setStatusFiltro}
          orgaoFiltro={orgaoFiltro}
          setOrgaoFiltro={setOrgaoFiltro}
          tipoAtoFiltro={tipoAtoFiltro}
          setTipoAtoFiltro={setTipoAtoFiltro}
          campoData={campoData}
          setCampoData={setCampoData}
          dataDe={dataDe}
          setDataDe={setDataDe}
          dataAte={dataAte}
          setDataAte={setDataAte}
          filtrosAtivos={filtrosAtivos}
          limparFiltros={limparFiltros}
          exportUrl={exportUrl}
          totalFiltrados={filtrados.length}
        />

        <div className="flex-1" />
        {!arquivados && (
          <>
            <button
              onClick={() => setImportarAberto(true)}
              disabled={loading || statusOptions.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-accent hover:text-accent disabled:opacity-50"
            >
              <IconUpload className="h-4 w-4" />
              Importar planilha
            </button>
            <button
              onClick={() => setNovoAberto(true)}
              disabled={loading || statusOptions.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
            >
              <IconPlus className="h-4 w-4" />
              Novo protocolo
            </button>
          </>
        )}
      </div>

      {!loading && (
        <p className="mb-2 text-xs text-slate-500">
          {filtrados.length} de {totalNaVisao} protocolo(s)
        </p>
      )}

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
              if (!v) return;
              const statusNome = statusOptions.find((s) => s.id === v)?.nome ?? "";
              if (
                confirm(
                  `Mudar o status de ${selecionados.size} protocolo(s) selecionado(s) para "${statusNome}"?`
                )
              ) {
                aplicarEmMassa({ statusId: v });
              }
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
        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
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
                    className={`border-b border-slate-100 transition-colors last:border-0 ${
                      situacao === "vencido"
                        ? "bg-red-50 hover:bg-red-100/70"
                        : situacao === "proximo"
                          ? "bg-amber-50 hover:bg-amber-100/70"
                          : "hover:bg-slate-50"
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
                          className={`inline-flex items-center gap-1 ${
                            situacao === "vencido"
                              ? "font-medium text-red-700"
                              : situacao === "proximo"
                                ? "font-medium text-amber-700"
                                : ""
                          }`}
                        >
                          {(situacao === "vencido" || situacao === "proximo") && (
                            <IconAlerta className="h-3.5 w-3.5 shrink-0" />
                          )}
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

type IconProps = { className?: string };

function IconUpload({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M8 10.5V2.5M8 2.5 5 5.5M8 2.5l3 3M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPlus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconAlerta({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M8 1.8 14.7 13a1 1 0 0 1-.87 1.5H2.17A1 1 0 0 1 1.3 13L8 1.8Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M8 6.3v3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r="0.9" fill="currentColor" />
    </svg>
  );
}
