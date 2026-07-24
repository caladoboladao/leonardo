import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

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
});

export const PATCH = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = updateSchema.parse(await req.json());
  const settings = await prisma.settings.upsert({
    where: { userId },
    update: body,
    create: { userId, ...body },
  });
  return NextResponse.json(settings);
});
