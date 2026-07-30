import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { computeDashboardStats } from "@/lib/dashboard";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async () => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const stats = await computeDashboardStats(userId);
  return NextResponse.json(stats);
});
