import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { computeDataVencimento } from "@/lib/protocolos";
import { buildProtocolosWhere } from "@/lib/protocolos-query";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const allowedSort = new Set([
    "empresa",
    "numeroProtocolo",
    "dataInicio",
    "dataVencimento",
    "createdAt",
    "updatedAt",
  ]);
  const orderBy = allowedSort.has(sortBy) ? { [sortBy]: sortDir } : { createdAt: "desc" as const };

  const protocolos = await prisma.protocolo.findMany({
    where: buildProtocolosWhere(userId, searchParams),
    include: {
      orgao: true,
      tipoAto: true,
      status: true,
      empresasVinculadas: true,
      protocolosVinculados: true,
      _count: { select: { lembretes: { where: { status: "PENDENTE" } } } },
    },
    orderBy,
  });

  return NextResponse.json(protocolos);
});

const createSchema = z.object({
  empresa: z.string().min(1),
  empresasVinculadas: z.array(z.string().min(1)).optional().default([]),
  protocolosVinculados: z.array(z.string().min(1)).optional().default([]),
  numeroProtocolo: z.string().optional(),
  cnpj: z.string().optional(),
  orgaoId: z.string().nullable().optional(),
  tipoAtoId: z.string().nullable().optional(),
  statusId: z.string().min(1),
  dataInicio: z.coerce.date(),
  prazoDias: z.number().int().min(0).nullable().optional(),
  clienteResponsavel: z.string().optional(),
  observacoes: z.string().optional(),
});

export const POST = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createSchema.parse(await req.json());

  const status = await prisma.status.findFirst({
    where: { id: body.statusId, userId },
  });
  if (!status) return NextResponse.json({ error: "status inválido" }, { status: 400 });

  const dataVencimento = computeDataVencimento(body.dataInicio, body.prazoDias);

  const protocolo = await prisma.protocolo.create({
    data: {
      userId,
      empresa: body.empresa,
      numeroProtocolo: body.numeroProtocolo,
      cnpj: body.cnpj,
      orgaoId: body.orgaoId ?? null,
      tipoAtoId: body.tipoAtoId ?? null,
      statusId: body.statusId,
      dataInicio: body.dataInicio,
      prazoDias: body.prazoDias ?? null,
      dataVencimento,
      dataConclusao: status.isConcluido ? new Date() : null,
      clienteResponsavel: body.clienteResponsavel,
      observacoes: body.observacoes,
      empresasVinculadas: {
        create: body.empresasVinculadas.map((nome) => ({ nome })),
      },
      protocolosVinculados: {
        create: body.protocolosVinculados.map((numero) => ({ numero })),
      },
      historicoStatus: {
        create: { statusNovoId: body.statusId },
      },
    },
    include: {
      orgao: true,
      tipoAto: true,
      status: true,
      empresasVinculadas: true,
      protocolosVinculados: true,
      _count: { select: { lembretes: { where: { status: "PENDENTE" } } } },
    },
  });

  return NextResponse.json(protocolo, { status: 201 });
});
