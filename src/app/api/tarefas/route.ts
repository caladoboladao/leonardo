import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const concluida = searchParams.get("concluida");
  const protocoloId = searchParams.get("protocoloId");
  const empresaId = searchParams.get("empresaId");
  const vencidas = searchParams.get("vencidas") === "true";
  const aVencerDias = searchParams.get("aVencerDias");

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const where: Record<string, unknown> = { userId };
  if (concluida === "true") where.concluida = true;
  else if (concluida === "false") where.concluida = false;
  if (protocoloId) where.protocoloId = protocoloId;
  if (empresaId) where.empresaId = empresaId;

  if (vencidas) {
    where.concluida = false;
    where.prazo = { lt: hoje };
  } else if (aVencerDias) {
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + Number(aVencerDias));
    where.concluida = false;
    where.prazo = { gte: hoje, lte: limite };
  }

  const tarefas = await prisma.tarefa.findMany({
    where,
    include: {
      protocolo: {
        select: { id: true, empresa: true, numeroProtocolo: true },
      },
      empresa: { select: { id: true, razaoSocial: true } },
    },
    orderBy: [{ concluida: "asc" }, { prazo: "asc" }, { ordem: "asc" }],
  });

  return NextResponse.json(tarefas);
});

const createSchema = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  prazo: z.coerce.date().nullable().optional(),
  protocoloId: z.string().optional(),
  empresaId: z.string().optional(),
  ordem: z.number().int().optional(),
});

export const POST = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createSchema.parse(await req.json());

  let empresaId = body.empresaId ?? null;

  if (body.protocoloId) {
    const protocolo = await prisma.protocolo.findFirst({
      where: { id: body.protocoloId, userId },
      select: { id: true, empresaId: true },
    });
    if (!protocolo) return NextResponse.json({ error: "protocolo inválido" }, { status: 400 });
    empresaId = empresaId ?? protocolo.empresaId;
  }

  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, userId } });
    if (!empresa) return NextResponse.json({ error: "empresa inválida" }, { status: 400 });
  }

  const tarefa = await prisma.tarefa.create({
    data: {
      userId,
      titulo: body.titulo,
      descricao: body.descricao,
      prazo: body.prazo ?? null,
      protocoloId: body.protocoloId ?? null,
      empresaId,
      ordem: body.ordem ?? 0,
      origem: "MANUAL",
    },
    include: {
      protocolo: { select: { id: true, empresa: true, numeroProtocolo: true } },
      empresa: { select: { id: true, razaoSocial: true } },
    },
  });

  return NextResponse.json(tarefa, { status: 201 });
});
