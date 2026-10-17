"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import {
  STATUS_TAREFA_LABEL,
  STATUS_TAREFA_ORDEM,
  StatusTarefa,
  Tarefa,
} from "@/lib/types";
import { TarefaPanel } from "./TarefaPanel";

type FiltroPrazo = "todas" | "vencidas" | "aVencer";
type Visao = "quadro" | "lista";

const STATUS_COR: Record<StatusTarefa, string> = {
  A_FAZER: "#94a3b8",
  EM_ANDAMENTO: "#f59e0b",
  CONCLUIDA: "#16a34a",
};

export function TarefasView({
  protocoloIdInicial,
  empresaIdInicial,
}: {
  protocoloIdInicial?: string;
  empresaIdInicial?: string;
} = {}) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [visao, setVisao] = useState<Visao>("quadro");
  const [filtroStatus, setFiltroStatus] = useState<StatusTarefa | "todas">("todas");
  const [filtroPrazo, setFiltroPrazo] = useState<FiltroPrazo>("todas");
  const [filtroProtocoloId, setFiltroProtocoloId] = useState(protocoloIdInicial ?? "");
  const [filtroEmpresaId, setFiltroEmpresaId] = useState(empresaIdInicial ?? "");
  const [q, setQ] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoPrazo, setNovoPrazo] = useState("");
  const [criando, setCriando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aplicandoEmMassa, setAplicandoEmMassa] = useState(false);
  const [tarefaAbertaId, setTarefaAbertaId] = useState<string | null>(null);

  const [nomeFiltro, setNomeFiltro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const dados = await api.get<Tarefa[]>("/api/tarefas");
      setTarefas(dados);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (filtroProtocoloId) {
      api
        .get<{ empresa: string }>(`/api/protocolos/${filtroProtocoloId}`)
        .then((p) => setNomeFiltro(p.empresa))
        .catch(() => setNomeFiltro(null));
    } else if (filtroEmpresaId) {
      api
        .get<{ razaoSocial: string }>(`/api/empresas/${filtroEmpresaId}`)
        .then((e) => setNomeFiltro(e.razaoSocial))
        .catch(() => setNomeFiltro(null));
    } else {
      setNomeFiltro(null);
    }
  }, [filtroProtocoloId, filtroEmpresaId]);

  const hojeStr = new Date().toISOString().slice(0, 10);
  const em7dias = new Date();
  em7dias.setDate(em7dias.getDate() + 7);
  const em7diasStr = em7dias.toISOString().slice(0, 10);

  const filtradas = useMemo(() => {
    let lista = tarefas;
    if (filtroProtocoloId) lista = lista.filter((t) => t.protocoloId === filtroProtocoloId);
    if (filtroEmpresaId) lista = lista.filter((t) => t.empresaId === filtroEmpresaId);
    if (filtroStatus !== "todas") lista = lista.filter((t) => t.status === filtroStatus);
    if (filtroPrazo === "vencidas") {
      lista = lista.filter(
        (t) => t.status !== "CONCLUIDA" && t.prazo && t.prazo.slice(0, 10) < hojeStr
      );
    } else if (filtroPrazo === "aVencer") {
      lista = lista.filter(
        (t) =>
          t.status !== "CONCLUIDA" &&
          t.prazo &&
          t.prazo.slice(0, 10) >= hojeStr &&
          t.prazo.slice(0, 10) <= em7diasStr
      );
    }
    if (responsavel.trim()) {
      const termo = responsavel.trim().toLowerCase();
      lista = lista.filter((t) => (t.responsavel ?? "").toLowerCase().includes(termo));
    }
    if (q.trim()) {
      const termo = q.trim().toLowerCase();
      lista = lista.filter(
        (t) =>
          t.titulo.toLowerCase().includes(termo) ||
          (t.protocolo?.empresa ?? "").toLowerCase().includes(termo) ||
          (t.empresa?.razaoSocial ?? "").toLowerCase().includes(termo)
      );
    }
    return lista;
  }, [
    tarefas,
    filtroProtocoloId,
    filtroEmpresaId,
    filtroStatus,
    filtroPrazo,
    responsavel,
    q,
    hojeStr,
    em7diasStr,
  ]);

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function mudarStatus(id: string, status: StatusTarefa) {
    const atualizada = await api.patch<Tarefa>(`/api/tarefas/${id}`, { status });
    setTarefas((prev) => prev.map((t) => (t.id === id ? atualizada : t)));
  }

  async function excluir(id: string) {
    await api.delete(`/api/tarefas/${id}`);
    setTarefas((prev) => prev.filter((x) => x.id !== id));
    setSelecionados((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function concluirSelecionadas() {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    setAplicandoEmMassa(true);
    try {
      const atualizadas = await Promise.all(
        ids.map((id) => api.patch<Tarefa>(`/api/tarefas/${id}`, { status: "CONCLUIDA" }))
      );
      setTarefas((prev) => {
        const map = new Map(atualizadas.map((a) => [a.id, a]));
        return prev.map((t) => map.get(t.id) ?? t);
      });
      setSelecionados(new Set());
    } finally {
      setAplicandoEmMassa(false);
    }
  }

  async function excluirSelecionadas() {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    if (!confirm(`Excluir ${ids.length} tarefa(s) selecionada(s)?`)) return;
    setAplicandoEmMassa(true);
    try {
      await Promise.all(ids.map((id) => api.delete(`/api/tarefas/${id}`)));
      setTarefas((prev) => prev.filter((t) => !selecionados.has(t.id)));
      setSelecionados(new Set());
    } finally {
      setAplicandoEmMassa(false);
    }
  }

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (!novoTitulo.trim()) return;
    setCriando(true);
    try {
      const tarefa = await api.post<Tarefa>("/api/tarefas", {
        titulo: novoTitulo.trim(),
        prazo: novoPrazo || undefined,
        protocoloId: filtroProtocoloId || undefined,
        empresaId: filtroEmpresaId || undefined,
      });
      setTarefas((prev) => [tarefa, ...prev]);
      setNovoTitulo("");
      setNovoPrazo("");
    } finally {
      setCriando(false);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Tarefas</h1>
        <div className="flex rounded-md border border-slate-300 p-0.5">
          <button
            onClick={() => setVisao("quadro")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              visao === "quadro" ? "bg-accent text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Quadro
          </button>
          <button
            onClick={() => setVisao("lista")}
            className={`rounded px-3 py-1 text-xs font-medium ${
              visao === "lista" ? "bg-accent text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Lista
          </button>
        </div>
      </div>

      {(filtroProtocoloId || filtroEmpresaId) && (
        <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
          <span>
            Mostrando tarefas de <strong>{nomeFiltro ?? "..."}</strong>
          </span>
          <button
            onClick={() => {
              setFiltroProtocoloId("");
              setFiltroEmpresaId("");
            }}
            className="text-xs text-accent hover:underline"
          >
            Ver todas as tarefas
          </button>
        </div>
      )}

      <form onSubmit={criar} className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          placeholder="Nova tarefa..."
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        />
        <input
          type="date"
          value={novoPrazo}
          onChange={(e) => setNovoPrazo(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={criando || !novoTitulo.trim()}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {visao === "lista" && (
          <>
            <button
              onClick={() => setFiltroStatus("todas")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                filtroStatus === "todas"
                  ? "bg-accent text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todas
            </button>
            {STATUS_TAREFA_ORDEM.map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(filtroStatus === s ? "todas" : s)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  filtroStatus === s
                    ? "text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                style={filtroStatus === s ? { backgroundColor: STATUS_COR[s] } : undefined}
              >
                {STATUS_TAREFA_LABEL[s]}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-slate-200" />
          </>
        )}
        <button
          onClick={() => setFiltroPrazo(filtroPrazo === "vencidas" ? "todas" : "vencidas")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            filtroPrazo === "vencidas"
              ? "bg-red-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Vencidas
        </button>
        <button
          onClick={() => setFiltroPrazo(filtroPrazo === "aVencer" ? "todas" : "aVencer")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            filtroPrazo === "aVencer"
              ? "bg-amber-500 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Vence em 7 dias
        </button>

        <input
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          placeholder="Responsável..."
          className="w-40 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título, protocolo ou empresa..."
          className="ml-auto w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none"
        />
      </div>

      {selecionados.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-accent/40 bg-accent-soft px-3 py-2 text-sm">
          <span className="font-medium text-accent">{selecionados.size} selecionada(s)</span>
          <button
            type="button"
            onClick={concluirSelecionadas}
            disabled={aplicandoEmMassa}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Marcar concluídas
          </button>
          <button
            type="button"
            onClick={excluirSelecionadas}
            disabled={aplicandoEmMassa}
            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Excluir selecionadas
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

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma tarefa encontrada.</p>
      ) : visao === "quadro" ? (
        <QuadroTarefas
          tarefas={filtradas}
          selecionados={selecionados}
          onToggleSelecionado={toggleSelecionado}
          onMudarStatus={mudarStatus}
          onAbrir={setTarefaAbertaId}
          hojeStr={hojeStr}
        />
      ) : (
        <ListaTarefas
          tarefas={filtradas}
          selecionados={selecionados}
          onToggleSelecionado={toggleSelecionado}
          onMudarStatus={mudarStatus}
          onExcluir={excluir}
          onAbrir={setTarefaAbertaId}
          hojeStr={hojeStr}
        />
      )}

      {tarefaAbertaId && (
        <TarefaPanel
          tarefaId={tarefaAbertaId}
          onClose={() => setTarefaAbertaId(null)}
          onChanged={(t) => setTarefas((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
          onDeleted={(id) => {
            setTarefas((prev) => prev.filter((x) => x.id !== id));
            setTarefaAbertaId(null);
          }}
        />
      )}
    </div>
  );
}

function ListaTarefas({
  tarefas,
  selecionados,
  onToggleSelecionado,
  onMudarStatus,
  onExcluir,
  onAbrir,
  hojeStr,
}: {
  tarefas: Tarefa[];
  selecionados: Set<string>;
  onToggleSelecionado: (id: string) => void;
  onMudarStatus: (id: string, status: StatusTarefa) => void;
  onExcluir: (id: string) => void;
  onAbrir: (id: string) => void;
  hojeStr: string;
}) {
  return (
    <ul className="space-y-2">
      {tarefas.map((t) => {
        const vencida = t.status !== "CONCLUIDA" && t.prazo && t.prazo.slice(0, 10) < hojeStr;
        return (
          <li
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
              vencida ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
            }`}
          >
            <input
              type="checkbox"
              checked={selecionados.has(t.id)}
              onChange={() => onToggleSelecionado(t.id)}
              className="mt-1"
            />
            <input
              type="checkbox"
              checked={t.status === "CONCLUIDA"}
              onChange={() => onMudarStatus(t.id, t.status === "CONCLUIDA" ? "A_FAZER" : "CONCLUIDA")}
              className="mt-1"
              title="Marcar concluída"
            />
            <div className="min-w-0 flex-1">
              <button
                onClick={() => onAbrir(t.id)}
                className={`text-left text-sm font-medium hover:underline ${
                  t.status === "CONCLUIDA" ? "text-slate-400 line-through" : "text-slate-800"
                }`}
              >
                {t.titulo}
              </button>
              {t.origem === "MODELO" && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-normal uppercase text-slate-500">
                  Modelo
                </span>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white"
                  style={{ backgroundColor: STATUS_COR[t.status] }}
                >
                  {STATUS_TAREFA_LABEL[t.status]}
                </span>
                {t.responsavel && <span>{t.responsavel}</span>}
                {t.prazo && (
                  <span className={vencida ? "font-medium text-red-700" : ""}>
                    Prazo: {new Date(t.prazo).toLocaleDateString("pt-BR")}
                  </span>
                )}
                {t.protocolo && (
                  <Link href={`/?protocolo=${t.protocolo.id}`} className="hover:underline">
                    {t.protocolo.empresa}
                    {t.protocolo.numeroProtocolo ? ` (${t.protocolo.numeroProtocolo})` : ""}
                  </Link>
                )}
                {!t.protocolo && t.empresa && (
                  <Link href={`/empresas/${t.empresa.id}`} className="hover:underline">
                    {t.empresa.razaoSocial}
                  </Link>
                )}
              </div>
            </div>
            <button
              onClick={() => onExcluir(t.id)}
              className="shrink-0 text-xs text-slate-400 hover:text-red-600"
            >
              Excluir
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function QuadroTarefas({
  tarefas,
  selecionados,
  onToggleSelecionado,
  onMudarStatus,
  onAbrir,
  hojeStr,
}: {
  tarefas: Tarefa[];
  selecionados: Set<string>;
  onToggleSelecionado: (id: string) => void;
  onMudarStatus: (id: string, status: StatusTarefa) => void;
  onAbrir: (id: string) => void;
  hojeStr: string;
}) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobreColuna, setSobreColuna] = useState<StatusTarefa | null>(null);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {STATUS_TAREFA_ORDEM.map((status) => {
        const itens = tarefas.filter((t) => t.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setSobreColuna(status);
            }}
            onDragLeave={() => setSobreColuna((c) => (c === status ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) onMudarStatus(id, status);
              setArrastando(null);
              setSobreColuna(null);
            }}
            className={`rounded-xl border p-2.5 ${
              sobreColuna === status
                ? "border-accent bg-accent-soft"
                : "border-slate-200 bg-slate-50/60"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 px-1">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COR[status] }}
              />
              <h3 className="text-sm font-semibold text-slate-900">
                {STATUS_TAREFA_LABEL[status]}
              </h3>
              <span className="text-xs text-slate-400">({itens.length})</span>
            </div>

            <div className="min-h-[60px] space-y-2">
              {itens.map((t) => {
                const vencida =
                  t.status !== "CONCLUIDA" && t.prazo && t.prazo.slice(0, 10) < hojeStr;
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", t.id);
                      setArrastando(t.id);
                    }}
                    onDragEnd={() => setArrastando(null)}
                    onClick={() => onAbrir(t.id)}
                    className={`cursor-pointer rounded-lg border bg-white p-2.5 shadow-sm transition-opacity hover:border-accent ${
                      arrastando === t.id ? "opacity-40" : ""
                    } ${vencida ? "border-red-200" : "border-slate-200"}`}
                  >
                    <div className="mb-1 flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selecionados.has(t.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => onToggleSelecionado(t.id)}
                        className="mt-0.5"
                      />
                      <p className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                        {t.titulo}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pl-5 text-xs text-slate-500">
                      {t.responsavel && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5">
                          {t.responsavel}
                        </span>
                      )}
                      {t.prazo && (
                        <span className={vencida ? "font-medium text-red-700" : ""}>
                          {new Date(t.prazo).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                    {(t.protocolo || t.empresa) && (
                      <p className="mt-1 truncate pl-5 text-xs text-slate-400">
                        {t.protocolo?.empresa ?? t.empresa?.razaoSocial}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
