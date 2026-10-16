import { ProtocolosView } from "@/components/protocolos/ProtocolosView";

export default async function ConcluidosPage({
  searchParams,
}: {
  searchParams: Promise<{ protocolo?: string }>;
}) {
  const { protocolo } = await searchParams;
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Concluídos</h1>
      <ProtocolosView arquivados={true} initialSelecionadoId={protocolo} />
    </div>
  );
}
