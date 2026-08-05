import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getUserId } from "@/lib/session";
import { computeDashboardStats, periodoFromParams } from "@/lib/dashboard";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute(async (req) => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stats = await computeDashboardStats(userId, periodoFromParams(searchParams));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Protocolos Societários";
  workbook.created = new Date(stats.geradoEm);

  const resumo = workbook.addWorksheet("Resumo");
  resumo.columns = [
    { header: "Indicador", key: "indicador", width: 42 },
    { header: "Valor", key: "valor", width: 16 },
  ];
  resumo.addRows([
    { indicador: "Período", valor: stats.periodoLabel },
    { indicador: "Protocolos ativos", valor: stats.totalAtivos },
    { indicador: "Vencendo nos próximos 7 dias", valor: stats.vencendoEstaSemana },
    { indicador: "Vencidos", valor: stats.vencidos },
    { indicador: "Parados sem movimentação", valor: stats.paradosSemMovimentacao },
    { indicador: "Abertos no período", valor: stats.abertosNoPeriodo },
    { indicador: "Concluídos no período", valor: stats.concluidosNoPeriodo },
    {
      indicador: "Tempo médio de conclusão (dias)",
      valor: stats.tempoMedioConclusaoDias ?? "—",
    },
  ]);
  resumo.getRow(1).font = { bold: true };

  const porStatus = workbook.addWorksheet("Por status");
  porStatus.columns = [
    { header: "Status", key: "nome", width: 32 },
    { header: "Total", key: "total", width: 12 },
  ];
  porStatus.addRows(stats.porStatus.map((s) => ({ nome: s.nome, total: s.total })));
  porStatus.getRow(1).font = { bold: true };

  const porOrgao = workbook.addWorksheet("Por órgão");
  porOrgao.columns = [
    { header: "Órgão", key: "nome", width: 32 },
    { header: "Total", key: "total", width: 12 },
  ];
  porOrgao.addRows(stats.porOrgao);
  porOrgao.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const dataArquivo = stats.geradoEm.slice(0, 10);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dashboard-protocolos-${dataArquivo}.xlsx"`,
    },
  });
});
