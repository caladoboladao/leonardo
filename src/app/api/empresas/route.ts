import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const empresas = await prisma.empresa.findMany({
    where: {
      userId,
      ...(q
        ? {
            OR: [
              { razaoSocial: { contains: q, mode: "insensitive" } },
              { cnpj: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { protocolos: true } } },
    orderBy: { razaoSocial: "asc" },
  });
  return NextResponse.json(empresas);
});

const createSchema = z.object({
  razaoSocial: z.string().min(1),
  cnpj: z.string().optional(),
  observacoes: z.string().optional(),
});

// Cria uma empresa nova, ou devolve a já existente se o CNPJ informado já
// pertencer a uma empresa deste usuário (evita duplicar ao digitar duas vezes).
export const POST = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createSchema.parse(await req.json());
  const cnpj = body.cnpj?.trim() || null;

  if (cnpj) {
    const existente = await prisma.empresa.findFirst({ where: { userId, cnpj } });
    if (existente) return NextResponse.json(existente);
  }

  const empresa = await prisma.empresa.create({
    data: {
      userId,
      razaoSocial: body.razaoSocial,
      cnpj,
      observacoes: body.observacoes,
    },
  });
  return NextResponse.json(empresa, { status: 201 });
});
