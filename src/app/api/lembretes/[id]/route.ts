import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  nota: z.string().min(1).optional(),
  status: z.enum(["PENDENTE", "RESOLVIDO"]).optional(),
  dataHora: z.coerce.date().optional(),
});

export const PATCH = apiRoute<Ctx>(async (req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.lembrete.findFirst({
    where: { id, protocolo: { userId } },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = updateSchema.parse(await req.json());
  const lembrete = await prisma.lembrete.update({ where: { id }, data: body });
  return NextResponse.json(lembrete);
});

export const DELETE = apiRoute<Ctx>(async (_req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.lembrete.findFirst({
    where: { id, protocolo: { userId } },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.lembrete.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
