import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipoAtoId = searchParams.get("tipoAtoId");

  const modelos = await prisma.modeloTarefa.findMany({
    where: { userId, ...(tipoAtoId ? { tipoAtoId } : {}) },
    orderBy: [{ tipoAtoId: "asc" }, { gatilho: "asc" }, { ordem: "asc" }],
  });
  return NextResponse.json(modelos);
});

const createSchema = z.object({
  tipoAtoId: z.string().min(1),
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  prazoDiasRelativo: z.number().int().nullable().optional(),
  gatilho: z.enum(["CRIACAO", "CONCLUSAO"]).default("CRIACAO"),
  ordem: z.number().int().optional(),
});

export const POST = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createSchema.parse(await req.json());

  const tipoAto = await prisma.tipoAto.findFirst({ where: { id: body.tipoAtoId, userId } });
  if (!tipoAto) return NextResponse.json({ error: "tipo de ato inválido" }, { status: 400 });

  let ordem = body.ordem;
  if (ordem === undefined) {
    const ultimo = await prisma.modeloTarefa.findFirst({
      where: { userId, tipoAtoId: body.tipoAtoId, gatilho: body.gatilho },
      orderBy: { ordem: "desc" },
    });
    ordem = (ultimo?.ordem ?? -1) + 1;
  }

  const modelo = await prisma.modeloTarefa.create({
    data: {
      userId,
      tipoAtoId: body.tipoAtoId,
      titulo: body.titulo,
      descricao: body.descricao,
      prazoDiasRelativo: body.prazoDiasRelativo ?? null,
      gatilho: body.gatilho,
      ordem,
    },
  });
  return NextResponse.json(modelo, { status: 201 });
});
