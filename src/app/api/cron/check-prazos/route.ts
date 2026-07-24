import { NextRequest, NextResponse } from "next/server";
import { executarChecagemAutomatica } from "@/lib/automacao";
import { apiRoute } from "@/lib/api-route";

function isAuthorized(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return false;
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  // header alternativo para chamadas manuais/outros agendadores
  return req.headers.get("x-cron-secret") === process.env.CRON_SECRET;
}

export const POST = apiRoute(async (req) => {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const resumo = await executarChecagemAutomatica();
  return NextResponse.json({ ok: true, resumo });
});

export async function GET(req: NextRequest) {
  return POST(req, undefined);
}
