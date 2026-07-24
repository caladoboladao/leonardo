import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiRoute<Ctx>(async (_req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const protocolo = await prisma.protocolo.findFirst({ where: { id, userId } });
  if (!protocolo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const lembretes = await prisma.lembrete.findMany({
    where: { protocoloId: id },
    orderBy: { dataHora: "desc" },
  });
  return NextResponse.json(lembretes);
});

const createSchema = z.object({
  nota: z.string().min(1),
  dataHora: z.coerce.date().optional(),
});

export const POST = apiRoute<Ctx>(async (req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const protocolo = await prisma.protocolo.findFirst({ where: { id, userId } });
  if (!protocolo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = createSchema.parse(await req.json());

  const lembrete = await prisma.lembrete.create({
    data: {
      protocoloId: id,
      nota: body.nota,
      dataHora: body.dataHora ?? new Date(),
      origem: "MANUAL",
      status: "PENDENTE",
    },
  });

  return NextResponse.json(lembrete, { status: 201 });
});
