import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

type Handler<Ctx> = (req: NextRequest, ctx: Ctx) => Promise<NextResponse>;

export function apiRoute<Ctx = unknown>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof ZodError) {
        return NextResponse.json(
          { error: e.issues[0]?.message ?? "Dados inválidos." },
          { status: 400 }
        );
      }
      console.error(e);
      return NextResponse.json({ error: "Erro interno." }, { status: 500 });
    }
  };
}
