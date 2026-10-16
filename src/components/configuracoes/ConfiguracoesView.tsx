"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import {
  GatilhoModeloTarefa,
  ModeloTarefa,
  OrgaoOption,
  Settings,
  StatusOption,
  TipoAtoOption,
} from "@/lib/types";

export function ConfiguracoesView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [orgaoOptions, setOrgaoOptions] = useState<OrgaoOption[]>([]);
  const [tipoAtoOptions, setTipoAtoOptions] = useState<TipoAtoOption[]>([]);
  const [modelosTarefa, setModelosTarefa] = useState<ModeloTarefa[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    const [cfg, status, orgaos, tipos, modelos] = await Promise.all([
      api.get<Settings>("/api/settings"),
      api.get<StatusOption[]>("/api/opcoes/status"),
      api.get<OrgaoOption[]>("/api/opcoes/orgaos"),
      api.get<TipoAtoOption[]>("/api/opcoes/tipos-ato"),
      api.get<ModeloTarefa[]>("/api/modelos-tarefa"),
    ]);
    setSettings(cfg);
    setStatusOptions(status);
    setOrgaoOptions(orgaos);
    setTipoAtoOptions(tipos);
    setModelosTarefa(modelos);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarSettings(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    const atualizado = await api.patch<Settings>("/api/settings", {
      diasAlertaPrazo: settings.diasAlertaPrazo,
      diasParado: settings.diasParado,
      statusEmExigenciaId: settings.statusEmExigenciaId,
    });
    setSettings(atualizado);
  }

  if (loading || !settings) return <p className="text-sm text-slate-500">Carregando...</p>;

  return (
    <div className="max-w-2xl space-y-8">
      <section>
        <h1 className="mb-3 text-lg font-semibold text-slate-900">Configurações</h1>
        <form
          onSubmit={salvarSettings}
          className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Alertar prazo com quantos dias de antecedência
            </label>
            <input
              type="number"
              min={0}
              value={settings.diasAlertaPrazo}
              onChange={(e) =>
                setSettings({ ...settings, diasAlertaPrazo: Number(e.target.value) })
              }
              className="w-32 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Dias sem mudança de status para alertar inatividade
            </label>
            <input
              type="number"
              min={1}
              value={settings.diasParado}
              onChange={(e) =>
                setSettings({ ...settings, diasParado: Number(e.target.value) })
              }
              className="w-32 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Status para mover automaticamente ao abrir uma exigência
            </label>
            <select
              value={settings.statusEmExigenciaId ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, statusEmExigenciaId: e.target.value || null })
              }
              className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none"
            >
              <option value="">Não mover automaticamente</option>
              {statusOptions
                .slice()
                .sort((a, b) => a.ordem - b.ordem)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
          >
            Salvar
          </button>
        </form>
      </section>

      <ListaStatus statusOptions={statusOptions} onChange={setStatusOptions} />
      <ListaNome
        titulo="Órgãos"
        itens={orgaoOptions}
        endpoint="/api/opcoes/orgaos"
        onChange={setOrgaoOptions}
      />
      <ListaNome
        titulo="Tipos de ato"
        itens={tipoAtoOptions}
        endpoint="/api/opcoes/tipos-ato"
        onChange={setTipoAtoOptions}
      />

      <ModelosTarefaSection
        tipoAtoOptions={tipoAtoOptions}
        modelosTarefa={modelosTarefa}
        onChange={setModelosTarefa}
      />
    </div>
  );
}

function ModelosTarefaSection({
  tipoAtoOptions,
  modelosTarefa,
  onChange,
}: {
  tipoAtoOptions: TipoAtoOption[];
  modelosTarefa: ModeloTarefa[];
  onChange: (v: ModeloTarefa[]) => void;
}) {
  const [tipoAtoId, setTipoAtoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [prazoDiasRelativo, setPrazoDiasRelativo] = useState("");
  const [gatilho, setGatilho] = useState<GatilhoModeloTarefa>("CRIACAO");
  const [saving, setSaving] = useState(false);

  const tipoAtoAtivo = tipoAtoId || tipoAtoOptions[0]?.id || "";

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !tipoAtoAtivo) return;
    setSaving(true);
    try {
      const criado = await api.post<ModeloTarefa>("/api/modelos-tarefa", {
        tipoAtoId: tipoAtoAtivo,
        titulo,
        prazoDiasRelativo: prazoDiasRelativo === "" ? null : Number(prazoDiasRelativo),
        gatilho,
      });
      onChange([...modelosTarefa, criado]);
      setTitulo("");
      setPrazoDiasRelativo("");
    } finally {
      setSaving(false);
    }
  }

  async function excluir(id: string) {
    await api.delete(`/api/modelos-tarefa/${id}`);
    onChange(modelosTarefa.filter((m) => m.id !== id));
  }

  async function atualizar(id: string, data: Partial<ModeloTarefa>) {
    const atualizado = await api.patch<ModeloTarefa>(`/api/modelos-tarefa/${id}`, data);
    onChange(modelosTarefa.map((m) => (m.id === id ? atualizado : m)));
  }

  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Modelos de tarefa por tipo de ato</h2>
      <p className="mb-3 text-xs text-slate-500">
        Checklists geradas automaticamente ao criar um protocolo desse tipo (gatilho
        &quot;Na criação&quot;) ou ao concluí-lo (&quot;Na conclusão&quot;, ex.: atualizar CNPJ na
        Receita, alvará/TLF na Prefeitura, cadastro na SEFAZ).
      </p>

      {tipoAtoOptions.length === 0 ? (
        <p className="text-sm text-slate-400">Cadastre um tipo de ato primeiro.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tipoAtoOptions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTipoAtoId(t.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  tipoAtoAtivo === t.id
                    ? "bg-accent text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.nome}
              </button>
            ))}
          </div>

          {(["CRIACAO", "CONCLUSAO"] as GatilhoModeloTarefa[]).map((g) => {
            const itens = modelosTarefa
              .filter((m) => m.tipoAtoId === tipoAtoAtivo && m.gatilho === g)
              .sort((a, b) => a.ordem - b.ordem);
            return (
              <div key={g} className="mb-3">
                <h3 className="mb-1.5 text-xs font-medium uppercase text-slate-500">
                  {g === "CRIACAO" ? "Na criação do protocolo" : "Na conclusão do protocolo"}
                </h3>
                {itens.length === 0 ? (
                  <p className="mb-2 text-sm text-slate-400">Nenhuma tarefa configurada.</p>
                ) : (
                  <ul className="mb-2 space-y-1.5">
                    {itens.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5"
                      >
                        <input
                          defaultValue={m.titulo}
                          onBlur={(e) => {
                            if (e.target.value !== m.titulo) atualizar(m.id, { titulo: e.target.value });
                          }}
                          className="flex-1 rounded border border-transparent px-1 py-0.5 text-sm hover:border-slate-300 focus:border-slate-400 outline-none"
                        />
                        <input
                          type="number"
                          defaultValue={m.prazoDiasRelativo ?? ""}
                          placeholder="dias"
                          onBlur={(e) => {
                            const v = e.target.value === "" ? null : Number(e.target.value);
                            if (v !== m.prazoDiasRelativo) atualizar(m.id, { prazoDiasRelativo: v });
                          }}
                          className="w-20 rounded border border-slate-300 px-1.5 py-0.5 text-xs outline-none"
                        />
                        <button
                          onClick={() => excluir(m.id)}
                          className="text-xs text-slate-400 hover:text-red-600"
                        >
                          Excluir
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          <form onSubmit={adicionar} className="flex flex-wrap items-center gap-2">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da tarefa..."
              className="min-w-[160px] flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none"
            />
            <input
              type="number"
              value={prazoDiasRelativo}
              onChange={(e) => setPrazoDiasRelativo(e.target.value)}
              placeholder="Dias"
              className="w-20 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none"
            />
            <select
              value={gatilho}
              onChange={(e) => setGatilho(e.target.value as GatilhoModeloTarefa)}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none"
            >
              <option value="CRIACAO">Na criação</option>
              <option value="CONCLUSAO">Na conclusão</option>
            </select>
            <button
              type="submit"
              disabled={saving || !tipoAtoAtivo}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
            >
              Adicionar
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function ListaStatus({
  statusOptions,
  onChange,
}: {
  statusOptions: StatusOption[];
  onChange: (v: StatusOption[]) => void;
}) {
  const [novoNome, setNovoNome] = useState("");
  const [novaCor, setNovaCor] = useState("#6b7280");
  const [saving, setSaving] = useState(false);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setSaving(true);
    try {
      const criado = await api.post<StatusOption>("/api/opcoes/status", {
        nome: novoNome,
        cor: novaCor,
      });
      onChange([...statusOptions, criado]);
      setNovoNome("");
    } finally {
      setSaving(false);
    }
  }

  async function atualizar(id: string, data: Partial<StatusOption>) {
    const atualizado = await api.patch<StatusOption>(`/api/opcoes/status/${id}`, data);
    onChange(statusOptions.map((s) => (s.id === id ? atualizado : s)));
  }

  async function excluir(id: string) {
    try {
      await api.delete(`/api/opcoes/status/${id}`);
      onChange(statusOptions.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-900">Status</h2>
      <ul className="mb-3 space-y-2">
        {statusOptions
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
            >
              <input
                type="color"
                value={s.cor}
                onChange={(e) => atualizar(s.id, { cor: e.target.value })}
                className="h-6 w-6 cursor-pointer rounded border-0"
              />
              <input
                defaultValue={s.nome}
                onBlur={(e) => {
                  if (e.target.value !== s.nome) atualizar(s.id, { nome: e.target.value });
                }}
                className="flex-1 rounded border border-transparent px-1 py-0.5 text-sm hover:border-slate-300 focus:border-slate-400 outline-none"
              />
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={s.isConcluido}
                  onChange={(e) => atualizar(s.id, { isConcluido: e.target.checked })}
                />
                Conclui protocolo
              </label>
              <button
                onClick={() => excluir(s.id)}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Excluir
              </button>
            </li>
          ))}
      </ul>
      <form onSubmit={adicionar} className="flex gap-2">
        <input
          type="color"
          value={novaCor}
          onChange={(e) => setNovaCor(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border-0"
        />
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Novo status..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>
    </section>
  );
}

function ListaNome({
  titulo,
  itens,
  endpoint,
  onChange,
}: {
  titulo: string;
  itens: { id: string; nome: string }[];
  endpoint: string;
  onChange: (v: { id: string; nome: string }[]) => void;
}) {
  const [novoNome, setNovoNome] = useState("");
  const [saving, setSaving] = useState(false);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setSaving(true);
    try {
      const criado = await api.post<{ id: string; nome: string }>(endpoint, {
        nome: novoNome,
      });
      onChange([...itens, criado]);
      setNovoNome("");
    } finally {
      setSaving(false);
    }
  }

  async function renomear(id: string, nome: string) {
    const atualizado = await api.patch<{ id: string; nome: string }>(`${endpoint}/${id}`, {
      nome,
    });
    onChange(itens.map((i) => (i.id === id ? atualizado : i)));
  }

  async function excluir(id: string) {
    await api.delete(`${endpoint}/${id}`);
    onChange(itens.filter((i) => i.id !== id));
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-900">{titulo}</h2>
      <ul className="mb-3 space-y-2">
        {itens.map((i) => (
          <li
            key={i.id}
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
          >
            <input
              defaultValue={i.nome}
              onBlur={(e) => {
                if (e.target.value !== i.nome) renomear(i.id, e.target.value);
              }}
              className="flex-1 rounded border border-transparent px-1 py-0.5 text-sm hover:border-slate-300 focus:border-slate-400 outline-none"
            />
            <button
              onClick={() => excluir(i.id)}
              className="text-xs text-slate-400 hover:text-red-600"
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar} className="flex gap-2">
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder={`Novo ${titulo.toLowerCase()}...`}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>
    </section>
  );
}
