"use client";

import { FormEvent, useState } from "react";
import { OrgaoOption, StatusOption } from "@/lib/types";

type Resultado = { criados: number; duplicados: number; invalidos: number };

export function ImportarPlanilhaDialog({
  statusOptions,
  orgaoOptions,
  onClose,
  onImported,
}: {
  statusOptions: StatusOption[];
  orgaoOptions: OrgaoOption[];
  onClose: () => void;
  onImported: () => void;
}) {
  const statusInicial =
    statusOptions.find((s) => s.nome.toLowerCase() === "protocolado")?.id ??
    statusOptions.slice().sort((a, b) => a.ordem - b.ordem)[0]?.id ??
    "";

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [statusId, setStatusId] = useState(statusInicial);
  const [orgaoId, setOrgaoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    setEnviando(true);
    setErro(null);
    try {
      const form = new FormData();
      form.append("file", arquivo);
      form.append("statusId", statusId);
      if (orgaoId) form.append("orgaoId", orgaoId);

      const res = await fetch("/api/protocolos/import", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Erro ao importar planilha");

      setResultado(body);
      if (body.criados > 0) onImported();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao importar planilha");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Importar planilha</h2>
        <p className="mb-4 text-sm text-slate-500">
          Arquivo .xlsx com colunas de cabeçalho <strong>Protocolo</strong>,{" "}
          <strong>Empresa</strong> e (opcional) <strong>Data</strong>. Protocolos já existentes
          são ignorados automaticamente.
        </p>

        <label className="mb-1 block text-sm font-medium text-slate-700">Arquivo</label>
        <input
          type="file"
          accept=".xlsx"
          required
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Status a aplicar nos importados
        </label>
        <select
          value={statusId}
          onChange={(e) => setStatusId(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        >
          {statusOptions
            .slice()
            .sort((a, b) => a.ordem - b.ordem)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Órgão a aplicar nos importados (opcional)
        </label>
        <select
          value={orgaoId}
          onChange={(e) => setOrgaoId(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        >
          <option value="">—</option>
          {orgaoOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>

        {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
        {resultado && (
          <p className="mb-3 text-sm text-slate-700">
            {resultado.criados} importado(s), {resultado.duplicados} já existente(s) ignorado(s)
            {resultado.invalidos > 0 ? `, ${resultado.invalidos} linha(s) inválida(s)` : ""}.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Fechar
          </button>
          <button
            type="submit"
            disabled={enviando || !arquivo}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-50"
          >
            {enviando ? "Importando..." : "Importar"}
          </button>
        </div>
      </form>
    </div>
  );
}
