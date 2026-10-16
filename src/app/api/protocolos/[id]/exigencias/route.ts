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

  const exigencias = await prisma.exigencia.findMany({
    where: { protocoloId: id },
    orderBy: { dataRecebimento: "desc" },
  });
  return NextResponse.json(exigencias);
});

const createSchema = z.object({
  descricao: z.string().min(1),
  dataRecebimento: z.coerce.date().optional(),
  prazoCumprimento: z.number().int().min(0).optional(),
});

export const POST = apiRoute<Ctx>(async (req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const protocolo = await prisma.protocolo.findFirst({
    where: { id, userId },
    include: { status: true },
  });
  if (!protocolo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = createSchema.parse(await req.json());

  const settings = await prisma.settings.findUnique({ where: { userId } });

  const exigencia = await prisma.$transaction(async (tx) => {
    const criada = await tx.exigencia.create({
      data: {
        protocoloId: id,
        descricao: body.descricao,
        dataRecebimento: body.dataRecebimento ?? new Date(),
        prazoCumprimento: body.prazoCumprimento ?? 30,
      },
    });

    // move o protocolo para o status "em exigência" configurado, se houver
    // e o protocolo ainda não estiver concluído nem já nesse status
    if (
      settings?.statusEmExigenciaId &&
      !protocolo.status.isConcluido &&
      protocolo.statusId !== settings.statusEmExigenciaId
    ) {
      await tx.statusHistorico.create({
        data: {
          protocoloId: id,
          statusAnteriorId: protocolo.statusId,
          statusNovoId: settings.statusEmExigenciaId,
        },
      });
      await tx.protocolo.update({
        where: { id },
        data: {
          statusId: settings.statusEmExigenciaId,
          ultimaMudancaStatusEm: new Date(),
          alertaParadoGeradoEm: null,
        },
      });
    }

    return criada;
  });

  return NextResponse.json(exigencia, { status: 201 });
});
