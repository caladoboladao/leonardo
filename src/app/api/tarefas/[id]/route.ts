import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  titulo: z.string().min(1).optional(),
  descricao: z.string().nullable().optional(),
  prazo: z.coerce.date().nullable().optional(),
  concluida: z.boolean().optional(),
  ordem: z.number().int().optional(),
});

export const PATCH = apiRoute<Ctx>(async (req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.tarefa.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = updateSchema.parse(await req.json());
  const data: Record<string, unknown> = {};
  if (body.titulo !== undefined) data.titulo = body.titulo;
  if (body.descricao !== undefined) data.descricao = body.descricao;
  if (body.prazo !== undefined) data.prazo = body.prazo;
  if (body.ordem !== undefined) data.ordem = body.ordem;
  if (body.concluida !== undefined) {
    data.concluida = body.concluida;
    data.dataConclusao = body.concluida ? new Date() : null;
  }

  const tarefa = await prisma.tarefa.update({
    where: { id },
    data,
    include: {
      protocolo: { select: { id: true, empresa: true, numeroProtocolo: true } },
      empresa: { select: { id: true, razaoSocial: true } },
    },
  });

  return NextResponse.json(tarefa);
});

export const DELETE = apiRoute<Ctx>(async (_req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.tarefa.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.tarefa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
