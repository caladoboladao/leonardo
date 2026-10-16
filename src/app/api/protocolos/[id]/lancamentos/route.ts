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

  const lancamentos = await prisma.lancamento.findMany({
    where: { protocoloId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(lancamentos);
});

const createSchema = z.object({
  tipo: z.enum(["TAXA", "HONORARIO"]),
  descricao: z.string().min(1),
  valor: z.number(),
  vencimento: z.coerce.date().nullable().optional(),
  situacao: z
    .enum(["A_PAGAR", "PAGO", "A_FATURAR", "FATURADO", "RECEBIDO"])
    .optional(),
});

export const POST = apiRoute<Ctx>(async (req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const protocolo = await prisma.protocolo.findFirst({ where: { id, userId } });
  if (!protocolo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = createSchema.parse(await req.json());
  const situacaoPadrao = body.tipo === "TAXA" ? "A_PAGAR" : "A_FATURAR";

  const lancamento = await prisma.lancamento.create({
    data: {
      protocoloId: id,
      tipo: body.tipo,
      descricao: body.descricao,
      valor: body.valor,
      vencimento: body.vencimento ?? null,
      situacao: body.situacao ?? situacaoPadrao,
    },
  });

  return NextResponse.json(lancamento, { status: 201 });
});
