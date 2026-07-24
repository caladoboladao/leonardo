import { ProtocolosView } from "@/components/protocolos/ProtocolosView";

export default async function ProtocolosPage({
  searchParams,
}: {
  searchParams: Promise<{ protocolo?: string }>;
}) {
  const { protocolo } = await searchParams;
  return <ProtocolosView arquivados={false} initialSelecionadoId={protocolo} />;
}
