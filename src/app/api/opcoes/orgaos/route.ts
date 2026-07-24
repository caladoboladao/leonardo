import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async () => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orgaos = await prisma.orgao.findMany({
    where: { userId },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(orgaos);
});

const createSchema = z.object({ nome: z.string().min(1) });

export const POST = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { nome } = createSchema.parse(await req.json());
  const orgao = await prisma.orgao.create({ data: { nome, userId } });
  return NextResponse.json(orgao, { status: 201 });
});
