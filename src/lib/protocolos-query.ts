import { Prisma } from "@prisma/client";

// Espelha a lógica de filtragem usada no cliente (ProtocolosView): um status
// escolhido explicitamente vale por si só, inclusive pra ver concluídos numa
// visão que normalmente os esconde; sem status escolhido, usa o escopo padrão
// (ativos ou concluídos) conforme `arquivados`.
export function buildProtocolosWhere(
  userId: string,
  searchParams: URLSearchParams
): Prisma.ProtocoloWhereInput {
  const q = searchParams.get("q");
  const statusId = searchParams.get("statusId");
  const orgaoId = searchParams.get("orgaoId");
  const tipoAtoId = searchParams.get("tipoAtoId");
  const arquivados = searchParams.get("arquivados") ?? "false";
  const campoData =
    searchParams.get("campoData") === "dataVencimento" ? "dataVencimento" : "dataInicio";
  const dataDe = searchParams.get("dataDe");
  const dataAte = searchParams.get("dataAte");

  const where: Prisma.ProtocoloWhereInput = {
    userId,
    ...(statusId
      ? { statusId }
      : arquivados === "true"
        ? { status: { isConcluido: true } }
        : arquivados === "all"
          ? {}
          : { status: { isConcluido: false } }),
    ...(orgaoId ? { orgaoId } : {}),
    ...(tipoAtoId ? { tipoAtoId } : {}),
    ...(q
      ? {
          OR: [
            { empresa: { contains: q, mode: "insensitive" } },
            { numeroProtocolo: { contains: q, mode: "insensitive" } },
            { cnpj: { contains: q, mode: "insensitive" } },
            { clienteResponsavel: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (dataDe || dataAte) {
    where[campoData] = {
      ...(dataDe ? { gte: new Date(`${dataDe}T00:00:00`) } : {}),
      ...(dataAte ? { lte: new Date(`${dataAte}T23:59:59`) } : {}),
    };
  }

  return where;
}
