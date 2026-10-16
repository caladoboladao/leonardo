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

  const [empresa, lancamentosResumo] = await Promise.all([
    prisma.empresa.findFirst({
      where: { id, userId },
      include: {
        protocolos: {
          orderBy: { createdAt: "desc" },
          include: {
            orgao: true,
            tipoAto: true,
            status: true,
            _count: { select: { lembretes: { where: { status: "PENDENTE" } } } },
          },
        },
      },
    }),
    prisma.lancamento.groupBy({
      by: ["tipo", "situacao"],
      where: { protocolo: { empresaId: id, userId } },
      _sum: { valor: true },
    }),
  ]);

  if (!empresa) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    ...empresa,
    lancamentosResumo: lancamentosResumo.map((r) => ({
      tipo: r.tipo,
      situacao: r.situacao,
      total: r._sum.valor ?? 0,
    })),
  });
});

const updateSchema = z.object({
  razaoSocial: z.string().min(1).optional(),
  cnpj: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export const PATCH = apiRoute<Ctx>(async (req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.empresa.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = updateSchema.parse(await req.json());
  const data: Record<string, unknown> = {};
  if (body.razaoSocial !== undefined) data.razaoSocial = body.razaoSocial;
  if (body.cnpj !== undefined) data.cnpj = body.cnpj?.trim() || null;
  if (body.observacoes !== undefined) data.observacoes = body.observacoes;

  const renomeou = body.razaoSocial !== undefined && body.razaoSocial !== existing.razaoSocial;

  const empresa = await prisma.$transaction(async (tx) => {
    const atualizada = await tx.empresa.update({ where: { id }, data });
    // mantém o nome espelhado nos protocolos (campo de exibição/busca) em dia
    if (renomeou) {
      await tx.protocolo.updateMany({
        where: { empresaId: id },
        data: { empresa: atualizada.razaoSocial },
      });
    }
    return atualizada;
  });

  return NextResponse.json(empresa);
});

export const DELETE = apiRoute<Ctx>(async (_req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.empresa.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const protocolos = await prisma.protocolo.count({ where: { empresaId: id } });
  if (protocolos > 0) {
    return NextResponse.json(
      { error: "Essa empresa tem protocolos vinculados e não pode ser excluída." },
      { status: 400 }
    );
  }

  await prisma.empresa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
