"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { EmpresaDetail, ProtocoloListItem, SITUACAO_LANCAMENTO_LABEL } from "@/lib/types";
import { formatCnpj } from "@/lib/format";
import { InlineText } from "@/components/protocolos/InlineEditors";

export function EmpresaDetailView({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const [detalhe, setDetalhe] = useState<EmpresaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<EmpresaDetail>(`/api/empresas/${empresaId}`)
      .then((e) => {
        setDetalhe(e);
        setObservacoes(e.observacoes ?? "");
      })
      .finally(() => setLoading(false));
  }, [empresaId]);

  async function atualizar(data: Record<string, unknown>) {
    const atualizada = await api.patch<EmpresaDetail>(`/api/empresas/${empresaId}`, data);
    setDetalhe((prev) => (prev ? { ...prev, ...atualizada } : prev));
  }

  async function excluir() {
    if (!confirm("Excluir esta empresa? Só é possível se não houver protocolos vinculados.")) return;
    setErro(null);
    try {
      await api.delete(`/api/empresas/${empresaId}`);
      router.push("/empresas");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao excluir empresa");
    }
  }

  if (loading || !detalhe) {
    return <p className="text-sm text-slate-500">Carregando...</p>;
  }

  const ativos = detalhe.protocolos.filter((p) => !p.status.isConcluido);
  const concluidos = detalhe.protocolos.filter((p) => p.status.isConcluido);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/empresas" className="text-sm text-slate-500 hover:underline">
          ← Empresas
        </Link>
        <button
          onClick={excluir}
          className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Excluir empresa
        </button>
      </div>

      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

      <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <span className="text-xs font-medium uppercase text-slate-500">Razão social</span>
        <InlineText
          value={detalhe.razaoSocial}
          onSave={(v) => atualizar({ razaoSocial: v })}
          className="text-lg font-semibold"
        />

        <div className="mt-3">
          <span className="text-xs font-medium uppercase text-slate-500">CNPJ</span>
          <InlineText
            value={detalhe.cnpj ?? ""}
            placeholder="—"
            onSave={(v) => atualizar({ cnpj: formatCnpj(v) || null })}
          />
        </div>

        <div className="mt-3">
          <span className="text-xs font-medium uppercase text-slate-500">Observações</span>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            onBlur={() => {
              if (observacoes !== (detalhe.observacoes ?? "")) {
                atualizar({ observacoes: observacoes || null });
              }
            }}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>

      {detalhe.lancamentosResumo.length > 0 && (
        <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Taxas e honorários</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {detalhe.lancamentosResumo.map((r) => (
              <li key={`${r.tipo}-${r.situacao}`} className="rounded-md bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">
                  {r.tipo === "TAXA" ? "Taxa" : "Honorário"} · {SITUACAO_LANCAMENTO_LABEL[r.situacao]}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {r.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ProtocolosDaEmpresa titulo="Protocolos ativos" protocolos={ativos} vazio="Nenhum protocolo ativo." basePath="/" />
      <ProtocolosDaEmpresa
        titulo="Protocolos concluídos"
        protocolos={concluidos}
        vazio="Nenhum protocolo concluído."
        basePath="/concluidos"
      />
    </div>
  );
}

function ProtocolosDaEmpresa({
  titulo,
  protocolos,
  vazio,
  basePath,
}: {
  titulo: string;
  protocolos: ProtocoloListItem[];
  vazio: string;
  basePath: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">
        {titulo} ({protocolos.length})
      </h2>
      {protocolos.length === 0 ? (
        <p className="text-sm text-slate-500">{vazio}</p>
      ) : (
        <ul className="space-y-1.5">
          {protocolos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <Link
                href={`${basePath}?protocolo=${p.id}`}
                className="truncate text-sm font-medium text-slate-700 hover:underline"
              >
                {p.numeroProtocolo ?? "Sem número"}
                {p.tipoAto ? ` · ${p.tipoAto.nome}` : ""}
              </Link>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: p.status.cor }}
              >
                {p.status.nome}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
