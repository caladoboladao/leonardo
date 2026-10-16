import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async () => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [
    settings,
    orgaos,
    tiposAto,
    status,
    empresas,
    protocolos,
    tarefasAvulsas,
    modelosTarefa,
  ] = await Promise.all([
    prisma.settings.findUnique({ where: { userId } }),
    prisma.orgao.findMany({ where: { userId } }),
    prisma.tipoAto.findMany({ where: { userId } }),
    prisma.status.findMany({ where: { userId } }),
    prisma.empresa.findMany({ where: { userId } }),
    prisma.protocolo.findMany({
      where: { userId },
      include: {
        empresasVinculadas: true,
        protocolosVinculados: true,
        historicoStatus: true,
        lembretes: true,
        tarefas: true,
        exigencias: true,
        lancamentos: true,
      },
    }),
    prisma.tarefa.findMany({ where: { userId, protocoloId: null } }),
    prisma.modeloTarefa.findMany({ where: { userId } }),
  ]);

  const backup = {
    geradoEm: new Date().toISOString(),
    versao: 1,
    settings,
    orgaos,
    tiposAto,
    status,
    empresas,
    protocolos,
    tarefasAvulsas,
    modelosTarefa,
  };

  const dataArquivo = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-protocolos-${dataArquivo}.json"`,
    },
  });
});
