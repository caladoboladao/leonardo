import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const lembretes = await prisma.lembrete.findMany({
    where: {
      protocolo: { userId },
      ...(status === "PENDENTE" || status === "RESOLVIDO" ? { status } : {}),
    },
    include: {
      protocolo: {
        select: {
          id: true,
          empresa: true,
          numeroProtocolo: true,
          status: { select: { nome: true, cor: true } },
        },
      },
    },
    orderBy: { dataHora: "desc" },
  });

  return NextResponse.json(lembretes);
});
