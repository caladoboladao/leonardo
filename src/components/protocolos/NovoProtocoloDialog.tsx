"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/api-client";
import { OrgaoOption, ProtocoloListItem, StatusOption, TipoAtoOption } from "@/lib/types";

export function NovoProtocoloDialog({
  statusOptions,
  orgaoOptions,
  tipoAtoOptions,
  onClose,
  onCreated,
}: {
  statusOptions: StatusOption[];
  orgaoOptions: OrgaoOption[];
  tipoAtoOptions: TipoAtoOption[];
  onClose: () => void;
  onCreated: (p: ProtocoloListItem) => void;
}) {
  const statusInicial =
    statusOptions.slice().sort((a, b) => a.ordem - b.ordem)[0]?.id ?? "";

  const [empresa, setEmpresa] = useState("");
  const [empresasVinculadas, setEmpresasVinculadas] = useState("");
  const [numeroProtocolo, setNumeroProtocolo] = useState("");
  const [orgaoId, setOrgaoId] = useState("");
  const [tipoAtoId, setTipoAtoId] = useState("");
  const [statusId, setStatusId] = useState(statusInicial);
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [prazoDias, setPrazoDias] = useState("");
  const [clienteResponsavel, setClienteResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const protocolo = await api.post<ProtocoloListItem>("/api/protocolos", {
        empresa,
        empresasVinculadas: empresasVinculadas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        numeroProtocolo: numeroProtocolo || undefined,
        orgaoId: orgaoId || null,
        tipoAtoId: tipoAtoId || null,
        statusId,
        dataInicio,
        prazoDias: prazoDias ? Number(prazoDias) : null,
        clienteResponsavel: clienteResponsavel || undefined,
        observacoes: observacoes || undefined,
      });
      onCreated(protocolo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar protocolo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 px-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Novo protocolo</h2>

        <label className="mb-1 block text-sm font-medium text-slate-700">Empresa *</label>
        <input
          required
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Empresas vinculadas (matriz/filiais, separadas por vírgula)
        </label>
        <input
          value={empresasVinculadas}
          onChange={(e) => setEmpresasVinculadas(e.target.value)}
          className="mb-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nº do protocolo
            </label>
            <input
              value={numeroProtocolo}
              onChange={(e) => setNumeroProtocolo(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
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
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Órgão</label>
            <select
              value={orgaoId}
              onChange={(e) => setOrgaoId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
            >
              <option value="">—</option>
              {orgaoOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tipo de ato
            </label>
            <select
              value={tipoAtoId}
              onChange={(e) => setTipoAtoId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
            >
              <option value="">—</option>
              {tipoAtoOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Data de início
            </label>
            <input
              type="date"
              required
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Prazo (dias)
            </label>
            <input
              type="number"
              min={0}
              value={prazoDias}
              onChange={(e) => setPrazoDias(e.target.value)}
              placeholder="opcional"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Cliente/responsável
        </label>
        <input
          value={clienteResponsavel}
          onChange={(e) => setClienteResponsavel(e.target.value)}
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
            {saving ? "Salvando..." : "Criar protocolo"}
          </button>
        </div>
      </form>
    </div>
  );
}
