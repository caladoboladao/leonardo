import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { buildProtocolosWhere } from "@/lib/protocolos-query";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const protocolos = await prisma.protocolo.findMany({
    where: buildProtocolosWhere(userId, searchParams),
    include: {
      orgao: true,
      tipoAto: true,
      status: true,
      lancamentos: { select: { valor: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Protocolos Societários";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Protocolos");
  sheet.columns = [
    { header: "Empresa", key: "empresa", width: 32 },
    { header: "Nº Protocolo", key: "numeroProtocolo", width: 18 },
    { header: "CNPJ", key: "cnpj", width: 20 },
    { header: "Órgão", key: "orgao", width: 20 },
    { header: "Tipo de ato", key: "tipoAto", width: 22 },
    { header: "Status", key: "status", width: 18 },
    { header: "Início", key: "dataInicio", width: 14 },
    { header: "Prazo (dias)", key: "prazoDias", width: 12 },
    { header: "Vencimento", key: "dataVencimento", width: 14 },
    { header: "Responsável", key: "clienteResponsavel", width: 22 },
    { header: "Data de conclusão", key: "dataConclusao", width: 16 },
    { header: "Valor (taxas + honorários)", key: "valor", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const p of protocolos) {
    sheet.addRow({
      empresa: p.empresa,
      numeroProtocolo: p.numeroProtocolo ?? "",
      cnpj: p.cnpj ?? "",
      orgao: p.orgao?.nome ?? "",
      tipoAto: p.tipoAto?.nome ?? "",
      status: p.status.nome,
      dataInicio: p.dataInicio.toLocaleDateString("pt-BR"),
      prazoDias: p.prazoDias ?? "",
      dataVencimento: p.dataVencimento ? p.dataVencimento.toLocaleDateString("pt-BR") : "",
      clienteResponsavel: p.clienteResponsavel ?? "",
      dataConclusao: p.dataConclusao ? p.dataConclusao.toLocaleDateString("pt-BR") : "",
      valor: p.lancamentos.reduce((soma, l) => soma + l.valor, 0),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const dataArquivo = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="protocolos-${dataArquivo}.xlsx"`,
    },
  });
});
