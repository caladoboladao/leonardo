import { prisma } from "@/lib/prisma";
import { diasEntre } from "@/lib/protocolos";

export type DashboardStats = {
  geradoEm: string;
  totalAtivos: number;
  vencendoEstaSemana: number;
  vencidos: number;
  paradosSemMovimentacao: number;
  abertosNoMes: number;
  concluidosNoMes: number;
  tempoMedioConclusaoDias: number | null;
  porStatus: { statusId: string; nome: string; cor: string; total: number }[];
  porOrgao: { nome: string; total: number }[];
};

export async function computeDashboardStats(userId: string): Promise<DashboardStats> {
  const [settings, ativos, concluidos] = await Promise.all([
    prisma.settings.findUnique({ where: { userId } }),
    prisma.protocolo.findMany({
      where: { userId, status: { isConcluido: false } },
      include: { status: true, orgao: true },
    }),
    prisma.protocolo.findMany({
      where: { userId, status: { isConcluido: true } },
      select: { dataInicio: true, ultimaMudancaStatusEm: true },
    }),
  ]);

  const diasParado = settings?.diasParado ?? 7;
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  let vencendoEstaSemana = 0;
  let vencidos = 0;
  let paradosSemMovimentacao = 0;
  let abertosNoMes = 0;

  const porStatusMap = new Map<
    string,
    { statusId: string; nome: string; cor: string; total: number }
  >();
  const porOrgaoMap = new Map<string, number>();

  for (const p of ativos) {
    if (p.dataVencimento) {
      const dias = diasEntre(hoje, p.dataVencimento);
      if (dias < 0) vencidos++;
      else if (dias <= 7) vencendoEstaSemana++;
    }
    if (diasEntre(p.ultimaMudancaStatusEm, hoje) >= diasParado) paradosSemMovimentacao++;
    if (p.createdAt >= inicioMes) abertosNoMes++;

    const atual = porStatusMap.get(p.statusId);
    if (atual) atual.total++;
    else
      porStatusMap.set(p.statusId, {
        statusId: p.statusId,
        nome: p.status.nome,
        cor: p.status.cor,
        total: 1,
      });

    const orgaoNome = p.orgao?.nome ?? "Sem órgão definido";
    porOrgaoMap.set(orgaoNome, (porOrgaoMap.get(orgaoNome) ?? 0) + 1);
  }

  let concluidosNoMes = 0;
  let somaDias = 0;
  for (const p of concluidos) {
    if (p.ultimaMudancaStatusEm >= inicioMes) concluidosNoMes++;
    somaDias += diasEntre(p.dataInicio, p.ultimaMudancaStatusEm);
  }
  const tempoMedioConclusaoDias =
    concluidos.length > 0 ? Math.round((somaDias / concluidos.length) * 10) / 10 : null;

  return {
    geradoEm: hoje.toISOString(),
    totalAtivos: ativos.length,
    vencendoEstaSemana,
    vencidos,
    paradosSemMovimentacao,
    abertosNoMes,
    concluidosNoMes,
    tempoMedioConclusaoDias,
    porStatus: Array.from(porStatusMap.values()).sort((a, b) => b.total - a.total),
    porOrgao: Array.from(porOrgaoMap.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total),
  };
}
