import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { computeDataVencimento } from "@/lib/protocolos";
import { apiRoute } from "@/lib/api-route";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiRoute<Ctx>(async (_req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const protocolo = await prisma.protocolo.findFirst({
    where: { id, userId },
    include: {
      orgao: true,
      tipoAto: true,
      status: true,
      empresasVinculadas: true,
      protocolosVinculados: true,
      lembretes: { orderBy: { dataHora: "desc" } },
      historicoStatus: {
        orderBy: { changedAt: "desc" },
        include: { statusAnterior: true, statusNovo: true },
      },
      _count: { select: { lembretes: { where: { status: "PENDENTE" } } } },
    },
  });

  if (!protocolo) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(protocolo);
});

const updateSchema = z.object({
  empresa: z.string().min(1).optional(),
  empresasVinculadas: z.array(z.string().min(1)).optional(),
  protocolosVinculados: z.array(z.string().min(1)).optional(),
  numeroProtocolo: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  orgaoId: z.string().nullable().optional(),
  tipoAtoId: z.string().nullable().optional(),
  statusId: z.string().optional(),
  dataInicio: z.coerce.date().optional(),
  prazoDias: z.number().int().min(0).nullable().optional(),
  clienteResponsavel: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export const PATCH = apiRoute<Ctx>(async (req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.protocolo.findFirst({
    where: { id, userId },
    include: { status: true },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = updateSchema.parse(await req.json());

  let novoStatus: { id: string; isConcluido: boolean } | null = null;
  if (body.statusId) {
    novoStatus = await prisma.status.findFirst({
      where: { id: body.statusId, userId },
    });
    if (!novoStatus) return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.empresa !== undefined) data.empresa = body.empresa;
  if (body.numeroProtocolo !== undefined) data.numeroProtocolo = body.numeroProtocolo;
  if (body.cnpj !== undefined) data.cnpj = body.cnpj;
  if (body.orgaoId !== undefined) data.orgaoId = body.orgaoId;
  if (body.tipoAtoId !== undefined) data.tipoAtoId = body.tipoAtoId;
  if (body.clienteResponsavel !== undefined) data.clienteResponsavel = body.clienteResponsavel;
  if (body.observacoes !== undefined) data.observacoes = body.observacoes;

  const statusMudou = body.statusId !== undefined && body.statusId !== existing.statusId;
  if (statusMudou) {
    data.statusId = body.statusId;
    data.ultimaMudancaStatusEm = new Date();
    data.alertaParadoGeradoEm = null;

    if (!existing.status.isConcluido && novoStatus!.isConcluido) {
      data.dataConclusao = new Date();
    } else if (existing.status.isConcluido && !novoStatus!.isConcluido) {
      data.dataConclusao = null;
    }
  }

  const prazoOuInicioMudou =
    (body.dataInicio !== undefined &&
      body.dataInicio.getTime() !== existing.dataInicio.getTime()) ||
    (body.prazoDias !== undefined && body.prazoDias !== existing.prazoDias);

  if (body.dataInicio !== undefined) data.dataInicio = body.dataInicio;
  if (body.prazoDias !== undefined) data.prazoDias = body.prazoDias;

  if (prazoOuInicioMudou) {
    const novaDataInicio = body.dataInicio ?? existing.dataInicio;
    const novoPrazo = body.prazoDias !== undefined ? body.prazoDias : existing.prazoDias;
    data.dataVencimento = computeDataVencimento(novaDataInicio, novoPrazo);
    data.alertaPrazoGeradoEm = null;
  }

  const protocolo = await prisma.$transaction(async (tx) => {
    if (statusMudou && body.statusId) {
      await tx.statusHistorico.create({
        data: {
          protocoloId: id,
          statusAnteriorId: existing.statusId,
          statusNovoId: body.statusId,
        },
      });
    }

    if (body.empresasVinculadas !== undefined) {
      await tx.empresaVinculada.deleteMany({ where: { protocoloId: id } });
      if (body.empresasVinculadas.length > 0) {
        await tx.empresaVinculada.createMany({
          data: body.empresasVinculadas.map((nome) => ({ protocoloId: id, nome })),
        });
      }
    }

    if (body.protocolosVinculados !== undefined) {
      await tx.protocoloVinculado.deleteMany({ where: { protocoloId: id } });
      if (body.protocolosVinculados.length > 0) {
        await tx.protocoloVinculado.createMany({
          data: body.protocolosVinculados.map((numero) => ({ protocoloId: id, numero })),
        });
      }
    }

    return tx.protocolo.update({
      where: { id },
      data,
      include: {
        orgao: true,
        tipoAto: true,
        status: true,
        empresasVinculadas: true,
        protocolosVinculados: true,
        _count: { select: { lembretes: { where: { status: "PENDENTE" } } } },
      },
    });
  });

  return NextResponse.json(protocolo);
});

export const DELETE = apiRoute<Ctx>(async (_req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.protocolo.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.protocolo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
