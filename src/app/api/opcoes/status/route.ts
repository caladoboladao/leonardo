import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async () => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = await prisma.status.findMany({
    where: { userId },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json(status);
});

const createSchema = z.object({
  nome: z.string().min(1),
  cor: z.string().default("#6b7280"),
  isConcluido: z.boolean().default(false),
});

export const POST = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createSchema.parse(await req.json());

  const maxOrdem = await prisma.status.aggregate({
    where: { userId },
    _max: { ordem: true },
  });

  const status = await prisma.status.create({
    data: {
      ...body,
      userId,
      ordem: (maxOrdem._max.ordem ?? -1) + 1,
    },
  });

  return NextResponse.json(status, { status: 201 });
});
