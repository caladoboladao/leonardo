export function diasEntre(de: Date, ate: Date): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  const inicio = new Date(de.getFullYear(), de.getMonth(), de.getDate());
  const fim = new Date(ate.getFullYear(), ate.getMonth(), ate.getDate());
  return Math.round((fim.getTime() - inicio.getTime()) / msPorDia);
}

export type VencimentoSituacao = "ok" | "proximo" | "vencido";

export function situacaoVencimento(
  dataVencimento: string | null,
  isConcluido: boolean,
  diasAlerta: number
): VencimentoSituacao | null {
  if (!dataVencimento || isConcluido) return null;
  const dias = diasEntre(new Date(), new Date(dataVencimento));
  if (dias < 0) return "vencido";
  if (dias <= diasAlerta) return "proximo";
  return "ok";
}
