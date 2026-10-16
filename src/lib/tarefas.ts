import { Prisma, GatilhoModeloTarefa } from "@prisma/client";
import { computeDataVencimento } from "@/lib/protocolos";

type Tx = Prisma.TransactionClient;

// Gera as tarefas configuradas em ModeloTarefa para o tipo de ato do
// protocolo, no gatilho informado (criação do protocolo ou conclusão).
export async function gerarTarefasDeModelo(
  tx: Tx,
  params: {
    userId: string;
    protocoloId: string;
    empresaId: string;
    tipoAtoId: string | null;
    gatilho: GatilhoModeloTarefa;
    dataBase: Date;
  }
) {
  const { userId, protocoloId, empresaId, tipoAtoId, gatilho, dataBase } = params;
  if (!tipoAtoId) return;

  const modelos = await tx.modeloTarefa.findMany({
    where: { userId, tipoAtoId, gatilho },
    orderBy: { ordem: "asc" },
  });
  if (modelos.length === 0) return;

  await tx.tarefa.createMany({
    data: modelos.map((m) => ({
      userId,
      protocoloId,
      empresaId,
      titulo: m.titulo,
      descricao: m.descricao,
      prazo: computeDataVencimento(dataBase, m.prazoDiasRelativo),
      ordem: m.ordem,
      origem: "MODELO",
    })),
  });
}
