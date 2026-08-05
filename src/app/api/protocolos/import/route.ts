import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";

function normalizeHeader(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

function cellToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") {
    const obj = value as { text?: string; richText?: { text: string }[]; result?: unknown };
    if (obj.richText) return obj.richText.map((t) => t.text).join("").trim();
    if (typeof obj.text === "string") return obj.text.trim();
    if ("result" in obj) return cellToText(obj.result);
  }
  return String(value).trim();
}

function parseData(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const texto = value.trim();
    const match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const [, d, m, y] = match;
      const ano = Number(y);
      if (ano >= 1900 && ano <= 2200) {
        const data = new Date(ano, Number(m) - 1, Number(d));
        if (!Number.isNaN(data.getTime())) return data;
      }
    }
    const generico = new Date(texto);
    if (!Number.isNaN(generico.getTime()) && generico.getFullYear() >= 1900) return generico;
  }
  return null;
}

export const POST = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const statusId = form.get("statusId");
  const orgaoIdRaw = form.get("orgaoId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecione um arquivo .xlsx." }, { status: 400 });
  }
  if (typeof statusId !== "string" || !statusId) {
    return NextResponse.json({ error: "Escolha o status a aplicar aos importados." }, { status: 400 });
  }

  const status = await prisma.status.findFirst({ where: { id: statusId, userId } });
  if (!status) return NextResponse.json({ error: "Status inválido." }, { status: 400 });

  let orgaoId: string | null = null;
  if (typeof orgaoIdRaw === "string" && orgaoIdRaw) {
    const orgao = await prisma.orgao.findFirst({ where: { id: orgaoIdRaw, userId } });
    if (!orgao) return NextResponse.json({ error: "Órgão inválido." }, { status: 400 });
    orgaoId = orgao.id;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return NextResponse.json({ error: "Planilha vazia." }, { status: 400 });

  let colProtocolo = -1;
  let colEmpresa = -1;
  let colData = -1;
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const h = normalizeHeader(cell.value);
    if (h === "protocolo") colProtocolo = colNumber;
    else if (h.startsWith("empresa")) colEmpresa = colNumber;
    else if (h === "data") colData = colNumber;
  });

  if (colProtocolo === -1 || colEmpresa === -1) {
    return NextResponse.json(
      { error: "A planilha precisa ter colunas de cabeçalho 'Protocolo' e 'Empresa'." },
      { status: 400 }
    );
  }

  const existentes = new Set(
    (
      await prisma.protocolo.findMany({
        where: { userId, numeroProtocolo: { not: null } },
        select: { numeroProtocolo: true },
      })
    ).map((p) => p.numeroProtocolo as string)
  );

  let criados = 0;
  let duplicados = 0;
  let invalidos = 0;
  const hoje = new Date();

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const numero = cellToText(row.getCell(colProtocolo).value);
    const empresa = cellToText(row.getCell(colEmpresa).value);
    if (!numero && !empresa) continue;
    if (!numero || !empresa) {
      invalidos++;
      continue;
    }
    if (existentes.has(numero)) {
      duplicados++;
      continue;
    }

    const dataInicio = colData !== -1 ? (parseData(row.getCell(colData).value) ?? hoje) : hoje;

    await prisma.protocolo.create({
      data: {
        userId,
        empresa,
        numeroProtocolo: numero,
        orgaoId,
        statusId,
        dataInicio,
        historicoStatus: { create: { statusNovoId: statusId } },
      },
    });
    existentes.add(numero);
    criados++;
  }

  return NextResponse.json({ criados, duplicados, invalidos });
});
