import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";
import { COLUNAS_PROTOCOLOS } from "@/lib/types";

export const GET = apiRoute(async () => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const settings = await prisma.settings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return NextResponse.json(settings);
});

const updateSchema = z.object({
  diasAlertaPrazo: z.number().int().min(0).optional(),
  diasParado: z.number().int().min(1).optional(),
  statusEmExigenciaId: z.string().nullable().optional(),
  colunasVisiveisProtocolos: z.array(z.enum(COLUNAS_PROTOCOLOS)).nullable().optional(),
  importStatusIdPadrao: z.string().nullable().optional(),
  importOrgaoIdPadrao: z.string().nullable().optional(),
  importTipoAtoIdPadrao: z.string().nullable().optional(),
  notificarPorEmail: z.boolean().optional(),
});

export const PATCH = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = updateSchema.parse(await req.json());

  const [statusEmExigencia, importStatus, importOrgao, importTipoAto] = await Promise.all([
    body.statusEmExigenciaId
      ? prisma.status.findFirst({ where: { id: body.statusEmExigenciaId, userId } })
      : Promise.resolve(undefined),
    body.importStatusIdPadrao
      ? prisma.status.findFirst({ where: { id: body.importStatusIdPadrao, userId } })
      : Promise.resolve(undefined),
    body.importOrgaoIdPadrao
      ? prisma.orgao.findFirst({ where: { id: body.importOrgaoIdPadrao, userId } })
      : Promise.resolve(undefined),
    body.importTipoAtoIdPadrao
      ? prisma.tipoAto.findFirst({ where: { id: body.importTipoAtoIdPadrao, userId } })
      : Promise.resolve(undefined),
  ]);

  if (body.statusEmExigenciaId && !statusEmExigencia) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }
  if (body.importStatusIdPadrao && !importStatus) {
    return NextResponse.json({ error: "status padrão de importação inválido" }, { status: 400 });
  }
  if (body.importOrgaoIdPadrao && !importOrgao) {
    return NextResponse.json({ error: "órgão padrão de importação inválido" }, { status: 400 });
  }
  if (body.importTipoAtoIdPadrao && !importTipoAto) {
    return NextResponse.json({ error: "tipo de ato padrão de importação inválido" }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    ...(body.diasAlertaPrazo !== undefined && { diasAlertaPrazo: body.diasAlertaPrazo }),
    ...(body.diasParado !== undefined && { diasParado: body.diasParado }),
    ...(body.statusEmExigenciaId !== undefined && {
      statusEmExigenciaId: body.statusEmExigenciaId,
    }),
    ...(body.colunasVisiveisProtocolos !== undefined && {
      colunasVisiveisProtocolos:
        body.colunasVisiveisProtocolos === null
          ? Prisma.JsonNull
          : body.colunasVisiveisProtocolos,
    }),
    ...(body.importStatusIdPadrao !== undefined && {
      importStatusIdPadrao: body.importStatusIdPadrao,
    }),
    ...(body.importOrgaoIdPadrao !== undefined && {
      importOrgaoIdPadrao: body.importOrgaoIdPadrao,
    }),
    ...(body.importTipoAtoIdPadrao !== undefined && {
      importTipoAtoIdPadrao: body.importTipoAtoIdPadrao,
    }),
    ...(body.notificarPorEmail !== undefined && { notificarPorEmail: body.notificarPorEmail }),
  };

  const settings = await prisma.settings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return NextResponse.json(settings);
});
