"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Tarefa } from "@/lib/types";

type FiltroPrazo = "todas" | "vencidas" | "aVencer";

export function TarefasView() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  const [filtroPrazo, setFiltroPrazo] = useState<FiltroPrazo>("todas");
  const [q, setQ] = useState("");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoPrazo, setNovoPrazo] = useState("");
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("concluida", mostrarConcluidas ? "true" : "false");
      if (!mostrarConcluidas && filtroPrazo === "vencidas") params.set("vencidas", "true");
      if (!mostrarConcluidas && filtroPrazo === "aVencer") params.set("aVencerDias", "7");
      const dados = await api.get<Tarefa[]>(`/api/tarefas?${params.toString()}`);
      setTarefas(dados);
    } finally {
      setLoading(false);
    }
  }, [mostrarConcluidas, filtroPrazo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtradas = useMemo(() => {
    if (!q.trim()) return tarefas;
    const termo = q.trim().toLowerCase();
    return tarefas.filter(
      (t) =>
        t.titulo.toLowerCase().includes(termo) ||
        (t.protocolo?.empresa ?? "").toLowerCase().includes(termo) ||
        (t.empresa?.razaoSocial ?? "").toLowerCase().includes(termo)
    );
  }, [tarefas, q]);

  async function alternarConcluida(t: Tarefa) {
    await api.patch(`/api/tarefas/${t.id}`, { concluida: !t.concluida });
    setTarefas((prev) => prev.filter((x) => x.id !== t.id));
  }

  async function excluir(id: string) {
    await api.delete(`/api/tarefas/${id}`);
    setTarefas((prev) => prev.filter((x) => x.id !== id));
  }

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (!novoTitulo.trim()) return;
    setCriando(true);
    try {
      const tarefa = await api.post<Tarefa>("/api/tarefas", {
        titulo: novoTitulo.trim(),
        prazo: novoPrazo || undefined,
      });
      if (!mostrarConcluidas) setTarefas((prev) => [tarefa, ...prev]);
      setNovoTitulo("");
      setNovoPrazo("");
    } finally {
      setCriando(false);
    }
  }

  const hojeStr = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Tarefas</h1>

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
        <button
          onClick={() => setMostrarConcluidas(false)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            !mostrarConcluidas ? "bg-accent text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Pendentes
        </button>
        <button
          onClick={() => setMostrarConcluidas(true)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            mostrarConcluidas ? "bg-accent text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Concluídas
        </button>

        {!mostrarConcluidas && (
          <>
            <span className="mx-1 h-4 w-px bg-slate-200" />
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
          </>
        )}

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título, protocolo ou empresa..."
          className="ml-auto w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none"
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-sm text-slate-500">
          {mostrarConcluidas ? "Nenhuma tarefa concluída." : "Nenhuma tarefa pendente. 🎉"}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtradas.map((t) => {
            const vencida =
              !t.concluida && t.prazo && t.prazo.slice(0, 10) < hojeStr;
            return (
              <li
                key={t.id}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                  vencida ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={t.concluida}
                  onChange={() => alternarConcluida(t)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      t.concluida ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {t.titulo}
                    {t.origem === "MODELO" && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-normal uppercase text-slate-500">
                        Modelo
                      </span>
                    )}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
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
                  onClick={() => excluir(t.id)}
                  className="shrink-0 text-xs text-slate-400 hover:text-red-600"
                >
                  Excluir
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
