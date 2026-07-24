import { prisma } from "@/lib/prisma";
import { diasEntre } from "@/lib/protocolos";
import { sendLembretesDigest } from "@/lib/email";

export async function executarChecagemAutomatica() {
  const usuarios = await prisma.user.findMany({ include: { settings: true } });
  const resumo: { userId: string; gerados: number }[] = [];

  for (const usuario of usuarios) {
    const settings = usuario.settings ?? { diasAlertaPrazo: 5, diasParado: 7 };

    const protocolosAtivos = await prisma.protocolo.findMany({
      where: { userId: usuario.id, status: { isConcluido: false } },
      include: { status: true },
    });

    const hoje = new Date();
    const novosLembretes: { empresa: string; numeroProtocolo: string | null; nota: string }[] = [];

    for (const protocolo of protocolosAtivos) {
      if (
        protocolo.dataVencimento &&
        !protocolo.alertaPrazoGeradoEm &&
        diasEntre(hoje, protocolo.dataVencimento) <= settings.diasAlertaPrazo
      ) {
        const diasRestantes = diasEntre(hoje, protocolo.dataVencimento);
        const nota =
          diasRestantes >= 0
            ? `Prazo vence em ${diasRestantes} dia(s) (${protocolo.dataVencimento.toLocaleDateString("pt-BR")}).`
            : `Prazo vencido há ${Math.abs(diasRestantes)} dia(s) (${protocolo.dataVencimento.toLocaleDateString("pt-BR")}). Verifique necessidade de reprotocolar.`;

        await prisma.$transaction([
          prisma.lembrete.create({
            data: {
              protocoloId: protocolo.id,
              nota,
              origem: "PRAZO_ORGAO",
              status: "PENDENTE",
            },
          }),
          prisma.protocolo.update({
            where: { id: protocolo.id },
            data: { alertaPrazoGeradoEm: hoje },
          }),
        ]);

        novosLembretes.push({
          empresa: protocolo.empresa,
          numeroProtocolo: protocolo.numeroProtocolo,
          nota,
        });
      }

      const diasParado = diasEntre(protocolo.ultimaMudancaStatusEm, hoje);
      const jaAlertadoNesteCiclo =
        protocolo.alertaParadoGeradoEm &&
        protocolo.alertaParadoGeradoEm >= protocolo.ultimaMudancaStatusEm;

      if (diasParado >= settings.diasParado && !jaAlertadoNesteCiclo) {
        const nota = `Sem mudança de status há ${diasParado} dia(s) (status atual: ${protocolo.status.nome}).`;

        await prisma.$transaction([
          prisma.lembrete.create({
            data: {
              protocoloId: protocolo.id,
              nota,
              origem: "PARADO_SEM_MOVIMENTACAO",
              status: "PENDENTE",
            },
          }),
          prisma.protocolo.update({
            where: { id: protocolo.id },
            data: { alertaParadoGeradoEm: hoje },
          }),
        ]);

        novosLembretes.push({
          empresa: protocolo.empresa,
          numeroProtocolo: protocolo.numeroProtocolo,
          nota,
        });
      }
    }

    if (novosLembretes.length > 0) {
      await sendLembretesDigest({ to: usuario.email, itens: novosLembretes });
    }

    resumo.push({ userId: usuario.id, gerados: novosLembretes.length });
  }

  return resumo;
}
