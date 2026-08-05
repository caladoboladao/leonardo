import { prisma } from "@/lib/prisma";
import { diasEntre } from "@/lib/protocolos";

export type Periodo = { from: Date; to: Date; label: string } | null;

export type DashboardStats = {
  geradoEm: string;
  periodoLabel: string;
  totalAtivos: number;
  vencendoEstaSemana: number;
  vencidos: number;
  paradosSemMovimentacao: number;
  abertosNoPeriodo: number;
  concluidosNoPeriodo: number;
  tempoMedioConclusaoDias: number | null;
  porStatus: { statusId: string; nome: string; cor: string; total: number }[];
  porOrgao: { nome: string; total: number }[];
};

export async function computeDashboardStats(
  userId: string,
  periodo: Periodo
): Promise<DashboardStats> {
  const [settings, ativos, concluidos, abertosNoPeriodo] = await Promise.all([
    prisma.settings.findUnique({ where: { userId } }),
    prisma.protocolo.findMany({
      where: { userId, status: { isConcluido: false } },
      include: { status: true, orgao: true },
    }),
    prisma.protocolo.findMany({
      where: { userId, status: { isConcluido: true } },
      select: { dataInicio: true, ultimaMudancaStatusEm: true, dataConclusao: true },
    }),
    prisma.protocolo.count({
      where: {
        userId,
        ...(periodo ? { createdAt: { gte: periodo.from, lt: periodo.to } } : {}),
      },
    }),
  ]);

  const diasParado = settings?.diasParado ?? 7;
  const hoje = new Date();

  let vencendoEstaSemana = 0;
  let vencidos = 0;
  let paradosSemMovimentacao = 0;

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

  let concluidosNoPeriodo = 0;
  let somaDias = 0;
  let contamTempo = 0;
  for (const p of concluidos) {
    const dataConclusao = p.dataConclusao ?? p.ultimaMudancaStatusEm;
    const dentro = periodo ? dataConclusao >= periodo.from && dataConclusao < periodo.to : true;
    if (dentro) {
      concluidosNoPeriodo++;
      somaDias += diasEntre(p.dataInicio, dataConclusao);
      contamTempo++;
    }
  }
  const tempoMedioConclusaoDias =
    contamTempo > 0 ? Math.round((somaDias / contamTempo) * 10) / 10 : null;

  return {
    geradoEm: hoje.toISOString(),
    periodoLabel: periodo?.label ?? "Todo o período",
    totalAtivos: ativos.length,
    vencendoEstaSemana,
    vencidos,
    paradosSemMovimentacao,
    abertosNoPeriodo,
    concluidosNoPeriodo,
    tempoMedioConclusaoDias,
    porStatus: Array.from(porStatusMap.values()).sort((a, b) => b.total - a.total),
    porOrgao: Array.from(porOrgaoMap.entries())
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total),
  };
}

const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function periodoFromParams(searchParams: URLSearchParams): Periodo {
  if (searchParams.get("periodo") === "tudo") return null;

  const hoje = new Date();
  const anoParam = searchParams.get("ano");
  const mesParam = searchParams.get("mes");
  const ano = anoParam ? Number(anoParam) : hoje.getFullYear();
  const mes = mesParam ? Number(mesParam) - 1 : hoje.getMonth();

  if (Number.isNaN(ano) || Number.isNaN(mes) || mes < 0 || mes > 11) {
    return null;
  }

  return {
    from: new Date(ano, mes, 1),
    to: new Date(ano, mes + 1, 1),
    label: `${MESES_PT[mes]}/${ano}`,
  };
}
