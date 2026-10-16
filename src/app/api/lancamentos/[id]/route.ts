import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  descricao: z.string().min(1).optional(),
  valor: z.number().optional(),
  vencimento: z.coerce.date().nullable().optional(),
  dataPagamento: z.coerce.date().nullable().optional(),
  situacao: z.enum(["A_PAGAR", "PAGO", "A_FATURAR", "FATURADO", "RECEBIDO"]).optional(),
});

const SITUACOES_QUITADAS = new Set(["PAGO", "RECEBIDO"]);

export const PATCH = apiRoute<Ctx>(async (req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.lancamento.findFirst({
    where: { id, protocolo: { userId } },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = updateSchema.parse(await req.json());
  const data: Record<string, unknown> = {};
  if (body.descricao !== undefined) data.descricao = body.descricao;
  if (body.valor !== undefined) data.valor = body.valor;
  if (body.vencimento !== undefined) data.vencimento = body.vencimento;
  if (body.dataPagamento !== undefined) data.dataPagamento = body.dataPagamento;
  if (body.situacao !== undefined) {
    data.situacao = body.situacao;
    if (body.dataPagamento === undefined) {
      data.dataPagamento = SITUACOES_QUITADAS.has(body.situacao) ? new Date() : null;
    }
  }

  const lancamento = await prisma.lancamento.update({ where: { id }, data });
  return NextResponse.json(lancamento);
});

export const DELETE = apiRoute<Ctx>(async (_req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.lancamento.findFirst({
    where: { id, protocolo: { userId } },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.lancamento.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
