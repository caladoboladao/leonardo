import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async () => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const protocoloInclude = {
    orgao: true,
    tipoAto: true,
    status: true,
    empresasVinculadas: true,
    protocolosVinculados: true,
    _count: {
      select: {
        lembretes: { where: { status: "PENDENTE" as const } },
        tarefas: { where: { status: { not: "CONCLUIDA" as const } } },
      },
    },
  };

  const [
    tarefasVencidas,
    tarefasHoje,
    protocolosVencidos,
    protocolosHoje,
    lembretesPendentes,
    exigenciasAbertas,
  ] = await Promise.all([
    prisma.tarefa.findMany({
      where: { userId, concluida: false, prazo: { lt: hoje } },
      include: {
        protocolo: { select: { id: true, empresa: true, numeroProtocolo: true } },
        empresa: { select: { id: true, razaoSocial: true } },
      },
      orderBy: { prazo: "asc" },
    }),
    prisma.tarefa.findMany({
      where: { userId, concluida: false, prazo: { gte: hoje, lt: amanha } },
      include: {
        protocolo: { select: { id: true, empresa: true, numeroProtocolo: true } },
        empresa: { select: { id: true, razaoSocial: true } },
      },
      orderBy: { prazo: "asc" },
    }),
    prisma.protocolo.findMany({
      where: {
        userId,
        status: { isConcluido: false },
        dataVencimento: { lt: hoje },
      },
      include: protocoloInclude,
      orderBy: { dataVencimento: "asc" },
    }),
    prisma.protocolo.findMany({
      where: {
        userId,
        status: { isConcluido: false },
        dataVencimento: { gte: hoje, lt: amanha },
      },
      include: protocoloInclude,
      orderBy: { dataVencimento: "asc" },
    }),
    prisma.lembrete.findMany({
      where: { protocolo: { userId }, status: "PENDENTE" },
      include: {
        protocolo: {
          select: {
            id: true,
            empresa: true,
            numeroProtocolo: true,
            status: { select: { nome: true, cor: true } },
          },
        },
      },
      orderBy: { dataHora: "desc" },
    }),
    prisma.exigencia.findMany({
      where: { status: "ABERTA", protocolo: { userId } },
      include: {
        protocolo: { select: { id: true, empresa: true, numeroProtocolo: true } },
      },
    }),
  ]);

  const exigenciasVencidas: typeof exigenciasAbertas = [];
  const exigenciasHoje: typeof exigenciasAbertas = [];
  for (const ex of exigenciasAbertas) {
    const prazoFinal = new Date(ex.dataRecebimento);
    prazoFinal.setDate(prazoFinal.getDate() + ex.prazoCumprimento);
    if (prazoFinal < hoje) exigenciasVencidas.push(ex);
    else if (prazoFinal < amanha) exigenciasHoje.push(ex);
  }

  return NextResponse.json({
    geradoEm: new Date().toISOString(),
    tarefasVencidas,
    tarefasHoje,
    protocolosVencidos,
    protocolosHoje,
    lembretesPendentes,
    exigenciasVencidas,
    exigenciasHoje,
  });
});
