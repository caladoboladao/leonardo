import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { apiRoute } from "@/lib/api-route";
import { formatCnpj } from "@/lib/format";

function normalizeHeader(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // remove acentos pra casar "Órgão" com "orgao" etc.
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

// Detecta as colunas pelo texto do cabeçalho (sem acento, minúsculo) em vez de
// exigir nomes exatos — planilhas diferentes usam nomes um pouco diferentes
// pro mesmo dado (ex.: "Data" vs "Data de autenticação").
function detectarColunas(headerRow: ExcelJS.Row) {
  const colunas = {
    protocolo: -1,
    empresa: -1,
    cnpj: -1,
    orgao: -1,
    tipo: -1,
    data: -1,
    lembrete: -1,
  };
  headerRow.eachCell((cell, colNumber) => {
    const h = normalizeHeader(cell.value);
    if (h === "protocolo" || h.startsWith("protocolo")) colunas.protocolo = colNumber;
    else if (h.startsWith("empresa")) colunas.empresa = colNumber;
    else if (h.includes("cnpj")) colunas.cnpj = colNumber;
    else if (h.includes("orgao")) colunas.orgao = colNumber;
    else if (h.includes("tipo")) colunas.tipo = colNumber;
    else if (h.includes("lembrete")) colunas.lembrete = colNumber;
    else if (h.includes("data")) colunas.data = colNumber;
  });
  return colunas;
}

export const POST = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const statusId = form.get("statusId");
  const orgaoIdPadraoRaw = form.get("orgaoId");
  const tipoAtoIdPadraoRaw = form.get("tipoAtoId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecione um arquivo .xlsx." }, { status: 400 });
  }
  if (typeof statusId !== "string" || !statusId) {
    return NextResponse.json({ error: "Escolha o status a aplicar aos importados." }, { status: 400 });
  }

  const status = await prisma.status.findFirst({ where: { id: statusId, userId } });
  if (!status) return NextResponse.json({ error: "Status inválido." }, { status: 400 });

  let orgaoIdPadrao: string | null = null;
  if (typeof orgaoIdPadraoRaw === "string" && orgaoIdPadraoRaw) {
    const orgao = await prisma.orgao.findFirst({ where: { id: orgaoIdPadraoRaw, userId } });
    if (!orgao) return NextResponse.json({ error: "Órgão inválido." }, { status: 400 });
    orgaoIdPadrao = orgao.id;
  }

  let tipoAtoIdPadrao: string | null = null;
  if (typeof tipoAtoIdPadraoRaw === "string" && tipoAtoIdPadraoRaw) {
    const tipoAto = await prisma.tipoAto.findFirst({ where: { id: tipoAtoIdPadraoRaw, userId } });
    if (!tipoAto) return NextResponse.json({ error: "Tipo de ato inválido." }, { status: 400 });
    tipoAtoIdPadrao = tipoAto.id;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return NextResponse.json({ error: "Planilha vazia." }, { status: 400 });

  // planilhas às vezes têm linhas de título antes do cabeçalho de verdade —
  // procura a primeira linha que tenha as colunas obrigatórias.
  let linhaCabecalho = -1;
  let colunas = detectarColunas(sheet.getRow(1));
  for (let r = 1; r <= Math.min(sheet.rowCount, 10); r++) {
    const candidato = detectarColunas(sheet.getRow(r));
    if (candidato.protocolo !== -1 && candidato.empresa !== -1) {
      linhaCabecalho = r;
      colunas = candidato;
      break;
    }
  }

  if (linhaCabecalho === -1) {
    return NextResponse.json(
      { error: "A planilha precisa ter colunas de cabeçalho 'Protocolo' e 'Empresa'." },
      { status: 400 }
    );
  }

  const [existentesRows, orgaosExistentes, tiposExistentes] = await Promise.all([
    prisma.protocolo.findMany({
      where: { userId, numeroProtocolo: { not: null } },
      select: { numeroProtocolo: true },
    }),
    prisma.orgao.findMany({ where: { userId } }),
    prisma.tipoAto.findMany({ where: { userId } }),
  ]);

  const existentes = new Set(existentesRows.map((p) => p.numeroProtocolo as string));
  const orgaoPorNome = new Map(orgaosExistentes.map((o) => [o.nome, o.id]));
  const tipoPorNome = new Map(tiposExistentes.map((t) => [t.nome, t.id]));
  let orgaosCriados = 0;
  let tiposCriados = 0;
  const uid = userId;

  async function resolverOrgao(nome: string): Promise<string> {
    const existente = orgaoPorNome.get(nome);
    if (existente) return existente;
    const criado = await prisma.orgao.create({ data: { userId: uid, nome } });
    orgaoPorNome.set(nome, criado.id);
    orgaosCriados++;
    return criado.id;
  }

  async function resolverTipoAto(nome: string): Promise<string> {
    const existente = tipoPorNome.get(nome);
    if (existente) return existente;
    const criado = await prisma.tipoAto.create({ data: { userId: uid, nome } });
    tipoPorNome.set(nome, criado.id);
    tiposCriados++;
    return criado.id;
  }

  let criados = 0;
  let duplicados = 0;
  let invalidos = 0;
  let lembretesCriados = 0;
  const hoje = new Date();

  for (let r = linhaCabecalho + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const numero = cellToText(row.getCell(colunas.protocolo).value);
    const empresa = cellToText(row.getCell(colunas.empresa).value);
    if (!numero && !empresa) continue;
    if (!numero || !empresa) {
      invalidos++;
      continue;
    }
    if (existentes.has(numero)) {
      duplicados++;
      continue;
    }

    const cnpjBruto = colunas.cnpj !== -1 ? cellToText(row.getCell(colunas.cnpj).value) : "";
    const cnpj = cnpjBruto ? formatCnpj(cnpjBruto) : null;
    const orgaoNome = colunas.orgao !== -1 ? cellToText(row.getCell(colunas.orgao).value) : "";
    const tipoNome = colunas.tipo !== -1 ? cellToText(row.getCell(colunas.tipo).value) : "";
    const lembreteNota =
      colunas.lembrete !== -1 ? cellToText(row.getCell(colunas.lembrete).value) : "";
    const dataInicio =
      colunas.data !== -1 ? (parseData(row.getCell(colunas.data).value) ?? hoje) : hoje;

    const orgaoId = orgaoNome ? await resolverOrgao(orgaoNome) : orgaoIdPadrao;
    const tipoAtoId = tipoNome ? await resolverTipoAto(tipoNome) : tipoAtoIdPadrao;

    const protocolo = await prisma.protocolo.create({
      data: {
        userId,
        empresa,
        numeroProtocolo: numero,
        cnpj,
        orgaoId,
        tipoAtoId,
        statusId,
        dataInicio,
        dataConclusao: status.isConcluido ? dataInicio : null,
        historicoStatus: { create: { statusNovoId: statusId } },
      },
    });

    if (lembreteNota) {
      await prisma.lembrete.create({
        data: { protocoloId: protocolo.id, nota: lembreteNota, origem: "MANUAL", status: "PENDENTE" },
      });
      lembretesCriados++;
    }

    existentes.add(numero);
    criados++;
  }

  return NextResponse.json({
    criados,
    duplicados,
    invalidos,
    orgaosCriados,
    tiposCriados,
    lembretesCriados,
  });
});
