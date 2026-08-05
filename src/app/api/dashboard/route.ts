import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { computeDashboardStats, periodoFromParams } from "@/lib/dashboard";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stats = await computeDashboardStats(userId, periodoFromParams(searchParams));
  return NextResponse.json(stats);
});
