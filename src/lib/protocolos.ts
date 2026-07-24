export function computeDataVencimento(
  dataInicio: Date,
  prazoDias: number | null | undefined
): Date | null {
  if (!prazoDias && prazoDias !== 0) return null;
  const vencimento = new Date(dataInicio);
  vencimento.setDate(vencimento.getDate() + prazoDias);
  return vencimento;
}

export function diasEntre(de: Date, ate: Date): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  const inicio = new Date(de.getFullYear(), de.getMonth(), de.getDate());
  const fim = new Date(ate.getFullYear(), ate.getMonth(), ate.getDate());
  return Math.round((fim.getTime() - inicio.getTime()) / msPorDia);
}
