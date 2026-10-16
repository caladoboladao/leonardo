import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  descricao: z.string().min(1).optional(),
  dataRecebimento: z.coerce.date().optional(),
  prazoCumprimento: z.number().int().min(0).optional(),
  numeroReprotocolo: z.string().nullable().optional(),
  status: z.enum(["ABERTA", "CUMPRIDA"]).optional(),
});

export const PATCH = apiRoute<Ctx>(async (req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.exigencia.findFirst({
    where: { id, protocolo: { userId } },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = updateSchema.parse(await req.json());
  const data: Record<string, unknown> = {};
  if (body.descricao !== undefined) data.descricao = body.descricao;
  if (body.dataRecebimento !== undefined) data.dataRecebimento = body.dataRecebimento;
  if (body.prazoCumprimento !== undefined) {
    data.prazoCumprimento = body.prazoCumprimento;
    data.alertaPrazoGeradoEm = null;
  }
  if (body.numeroReprotocolo !== undefined) data.numeroReprotocolo = body.numeroReprotocolo;
  if (body.status !== undefined) {
    data.status = body.status;
    data.dataCumprimento = body.status === "CUMPRIDA" ? new Date() : null;
  }

  const exigencia = await prisma.exigencia.update({ where: { id }, data });
  return NextResponse.json(exigencia);
});

export const DELETE = apiRoute<Ctx>(async (_req, { params }) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.exigencia.findFirst({
    where: { id, protocolo: { userId } },
  });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.exigencia.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
