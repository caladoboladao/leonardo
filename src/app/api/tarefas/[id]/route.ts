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
  responsavel: z.string().nullable().optional(),
  status: z.enum(["A_FAZER", "EM_ANDAMENTO", "CONCLUIDA"]).optional(),
  concluida: z.boolean().optional(),
  ordem: z.number().int().optional(),
  protocoloId: z.string().nullable().optional(),
  empresaId: z.string().nullable().optional(),
});

export const GET = apiRoute<Ctx>(async (_req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const tarefa = await prisma.tarefa.findFirst({
    where: { id, userId },
    include: {
      protocolo: { select: { id: true, empresa: true, numeroProtocolo: true } },
      empresa: { select: { id: true, razaoSocial: true } },
    },
  });
  if (!tarefa) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(tarefa);
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
  if (body.responsavel !== undefined) data.responsavel = body.responsavel;
  if (body.ordem !== undefined) data.ordem = body.ordem;

  // "status" (3 estados, usado pelo quadro) e "concluida" (2 estados,
  // usado pelos checkboxes) ficam sempre sincronizados — qualquer um dos
  // dois que vier na requisição atualiza ambos, junto com dataConclusao.
  if (body.status !== undefined) {
    data.status = body.status;
    data.concluida = body.status === "CONCLUIDA";
    data.dataConclusao =
      body.status === "CONCLUIDA" ? (existing.dataConclusao ?? new Date()) : null;
  } else if (body.concluida !== undefined) {
    data.concluida = body.concluida;
    data.status = body.concluida ? "CONCLUIDA" : "A_FAZER";
    data.dataConclusao = body.concluida ? new Date() : null;
  }

  if (body.protocoloId !== undefined) {
    if (body.protocoloId === null) {
      data.protocoloId = null;
    } else {
      const protocolo = await prisma.protocolo.findFirst({
        where: { id: body.protocoloId, userId },
        select: { id: true, empresaId: true },
      });
      if (!protocolo) return NextResponse.json({ error: "protocolo inválido" }, { status: 400 });
      data.protocoloId = protocolo.id;
      if (body.empresaId === undefined) data.empresaId = protocolo.empresaId;
    }
  }

  if (body.empresaId !== undefined) {
    if (body.empresaId === null) {
      data.empresaId = null;
    } else {
      const empresa = await prisma.empresa.findFirst({ where: { id: body.empresaId, userId } });
      if (!empresa) return NextResponse.json({ error: "empresa inválida" }, { status: 400 });
      data.empresaId = empresa.id;
    }
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
