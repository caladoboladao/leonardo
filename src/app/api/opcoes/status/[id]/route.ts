import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  cor: z.string().optional(),
  ordem: z.number().int().optional(),
  isConcluido: z.boolean().optional(),
});

export const PATCH = apiRoute<Ctx>(async (req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.status.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = updateSchema.parse(await req.json());
  const status = await prisma.status.update({ where: { id }, data: body });
  return NextResponse.json(status);
});

export const DELETE = apiRoute<Ctx>(async (_req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.status.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const emUso = await prisma.protocolo.count({ where: { statusId: id } });
  if (emUso > 0) {
    return NextResponse.json(
      { error: "Status em uso por protocolos existentes, não pode ser excluído." },
      { status: 409 }
    );
  }

  await prisma.status.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
