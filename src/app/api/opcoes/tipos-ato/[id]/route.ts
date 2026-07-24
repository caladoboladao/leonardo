import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({ nome: z.string().min(1) });

export const PATCH = apiRoute<Ctx>(async (req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.tipoAto.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { nome } = updateSchema.parse(await req.json());
  const tipo = await prisma.tipoAto.update({ where: { id }, data: { nome } });
  return NextResponse.json(tipo);
});

export const DELETE = apiRoute<Ctx>(async (_req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.tipoAto.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.protocolo.updateMany({ where: { tipoAtoId: id }, data: { tipoAtoId: null } });
  await prisma.tipoAto.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
