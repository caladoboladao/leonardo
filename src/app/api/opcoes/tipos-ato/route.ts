import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async () => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tipos = await prisma.tipoAto.findMany({
    where: { userId },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(tipos);
});

const createSchema = z.object({ nome: z.string().min(1) });

export const POST = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { nome } = createSchema.parse(await req.json());
  const tipo = await prisma.tipoAto.create({ data: { nome, userId } });
  return NextResponse.json(tipo, { status: 201 });
});
