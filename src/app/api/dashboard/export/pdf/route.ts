import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, RGB } from "pdf-lib";
import { getUserId } from "@/lib/session";
import { computeDashboardStats } from "@/lib/dashboard";
import { apiRoute } from "@/lib/api-route";

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

const INK = rgb(0.04, 0.04, 0.04);
const MUTED = rgb(0.35, 0.35, 0.33);

export const GET = apiRoute(async () => {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const stats = await computeDashboardStats(userId);

  const doc = await PDFDocument.create();
  let page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const marginX = 50;
  let y = 792;

  function ensureSpace(minY: number) {
    if (y < minY) {
      page = doc.addPage([595.28, 841.89]);
      y = 792;
    }
  }

  page.drawText("Resumo — Protocolos Societários", { x: marginX, y, size: 18, font: fontBold, color: INK });
  y -= 20;
  page.drawText(`Gerado em ${new Date(stats.geradoEm).toLocaleString("pt-BR")}`, {
    x: marginX,
    y,
    size: 10,
    font,
    color: MUTED,
  });
  y -= 34;

  const kpis: [string, string | number][] = [
    ["Protocolos ativos", stats.totalAtivos],
    ["Vencendo nos próximos 7 dias", stats.vencendoEstaSemana],
    ["Vencidos", stats.vencidos],
    ["Parados sem movimentação", stats.paradosSemMovimentacao],
    ["Abertos no mês", stats.abertosNoMes],
    ["Concluídos no mês", stats.concluidosNoMes],
    ["Tempo médio de conclusão (dias)", stats.tempoMedioConclusaoDias ?? "—"],
  ];
  for (const [label, valor] of kpis) {
    ensureSpace(60);
    page.drawText(label, { x: marginX, y, size: 11, font, color: INK });
    page.drawText(String(valor), { x: 400, y, size: 11, font: fontBold, color: INK });
    y -= 18;
  }
  y -= 20;

  ensureSpace(80);
  page.drawText("Ativos por status", { x: marginX, y, size: 13, font: fontBold, color: INK });
  y -= 20;
  if (stats.porStatus.length === 0) {
    page.drawText("Nenhum protocolo ativo.", { x: marginX, y, size: 10, font, color: MUTED });
    y -= 16;
  }
  for (const s of stats.porStatus) {
    ensureSpace(60);
    page.drawRectangle({ x: marginX, y: y - 1, width: 9, height: 9, color: hexToRgb(s.cor) });
    page.drawText(s.nome, { x: marginX + 16, y, size: 10, font, color: INK });
    page.drawText(String(s.total), { x: 400, y, size: 10, font, color: INK });
    y -= 16;
  }
  y -= 20;

  ensureSpace(80);
  page.drawText("Ativos por órgão", { x: marginX, y, size: 13, font: fontBold, color: INK });
  y -= 20;
  if (stats.porOrgao.length === 0) {
    page.drawText("Nenhum protocolo ativo.", { x: marginX, y, size: 10, font, color: MUTED });
    y -= 16;
  }
  for (const o of stats.porOrgao) {
    ensureSpace(60);
    page.drawText(o.nome, { x: marginX, y, size: 10, font, color: INK });
    page.drawText(String(o.total), { x: 400, y, size: 10, font, color: INK });
    y -= 16;
  }

  const bytes = await doc.save();
  const dataArquivo = stats.geradoEm.slice(0, 10);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="dashboard-protocolos-${dataArquivo}.pdf"`,
    },
  });
});
