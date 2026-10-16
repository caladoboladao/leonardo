"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Empresa, EmpresaListItem } from "@/lib/types";
import { formatCnpj } from "@/lib/format";

export function EmpresasView() {
  const [empresas, setEmpresas] = useState<EmpresaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [novoAberto, setNovoAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const dados = await api.get<EmpresaListItem[]>("/api/empresas");
      setEmpresas(dados);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtradas = useMemo(() => {
    if (!q.trim()) return empresas;
    const termo = q.trim().toLowerCase();
    return empresas.filter(
      (e) =>
        e.razaoSocial.toLowerCase().includes(termo) ||
        (e.cnpj ?? "").toLowerCase().includes(termo)
    );
  }, [empresas, q]);

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function excluirEmMassa() {
    if (selecionados.size === 0) return;
    if (!confirm(`Excluir ${selecionados.size} empresa(s) selecionada(s)?`)) return;
    setExcluindo(true);
    setErro(null);
    try {
      let bloqueadas = 0;
      for (const id of selecionados) {
        try {
          await api.delete(`/api/empresas/${id}`);
        } catch {
          bloqueadas++;
        }
      }
      if (bloqueadas > 0) {
        setErro(
          `${bloqueadas} empresa(s) não foram excluídas por ter protocolos vinculados.`
        );
      }
      setSelecionados(new Set());
      await carregar();
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Empresas</h1>
        <button
          onClick={() => setNovoAberto(true)}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Nova empresa
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por razão social ou CNPJ..."
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        />
      </div>

      {selecionados.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-600">{selecionados.size} selecionada(s)</span>
          <button
            type="button"
            onClick={excluirEmMassa}
            disabled={excluindo}
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

      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma empresa encontrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <table className="w-full min-w-[680px] border-collapse text-sm [table-layout:fixed]">
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 300 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 110 }} />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={filtradas.length > 0 && filtradas.every((e) => selecionados.has(e.id))}
                    ref={(el) => {
                      if (el)
                        el.indeterminate =
                          selecionados.size > 0 &&
                          !filtradas.every((e) => selecionados.has(e.id));
                    }}
                    onChange={(e) => {
                      setSelecionados((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) filtradas.forEach((emp) => next.add(emp.id));
                        else filtradas.forEach((emp) => next.delete(emp.id));
                        return next;
                      });
                    }}
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Razão social
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  CNPJ
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Protocolos
                </th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-1">
                    <input
                      type="checkbox"
                      checked={selecionados.has(e.id)}
                      onChange={() => toggleSelecionado(e.id)}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Link
                      href={`/empresas/${e.id}`}
                      className="block truncate rounded px-1.5 py-1 font-medium text-accent hover:underline"
                    >
                      {e.razaoSocial}
                    </Link>
                  </td>
                  <td className="px-2 py-1 text-slate-700">
                    {e.cnpj ? formatCnpj(e.cnpj) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-2 py-1 text-slate-700">{e._count.protocolos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {novoAberto && (
        <NovaEmpresaDialog
          onClose={() => setNovoAberto(false)}
          onCreated={(e) => {
            setEmpresas((prev) =>
              [...prev, { ...e, _count: { protocolos: 0 } }].sort((a, b) =>
                a.razaoSocial.localeCompare(b.razaoSocial)
              )
            );
            setNovoAberto(false);
          }}
        />
      )}
    </div>
  );
}

function NovaEmpresaDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (e: Empresa) => void;
}) {
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const empresa = await api.post<Empresa>("/api/empresas", {
        razaoSocial,
        cnpj: cnpj || undefined,
        observacoes: observacoes || undefined,
      });
      onCreated(empresa);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar empresa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Nova empresa</h2>

        <label className="mb-1 block text-sm font-medium text-slate-700">Razão social *</label>
        <input
          required
          value={razaoSocial}
          onChange={(e) => setRazaoSocial(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">CNPJ</label>
        <input
          value={cnpj}
          onChange={(e) => setCnpj(formatCnpj(e.target.value))}
          placeholder="00.000.000/0000-00"
          maxLength={18}
          className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">Observações</label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Criar empresa"}
          </button>
        </div>
      </form>
    </div>
  );
}
