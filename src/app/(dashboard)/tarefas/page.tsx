import { TarefasView } from "@/components/tarefas/TarefasView";

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ protocoloId?: string; empresaId?: string }>;
}) {
  const { protocoloId, empresaId } = await searchParams;
  return <TarefasView protocoloIdInicial={protocoloId} empresaIdInicial={empresaId} />;
}
