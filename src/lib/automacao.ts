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

    const exigenciasAbertas = await prisma.exigencia.findMany({
      where: {
        status: "ABERTA",
        alertaPrazoGeradoEm: null,
        protocolo: { userId: usuario.id },
      },
      include: {
        protocolo: { select: { id: true, empresa: true, numeroProtocolo: true } },
      },
    });

    for (const exigencia of exigenciasAbertas) {
      const prazoFinal = new Date(exigencia.dataRecebimento);
      prazoFinal.setDate(prazoFinal.getDate() + exigencia.prazoCumprimento);

      if (diasEntre(hoje, prazoFinal) <= settings.diasAlertaPrazo) {
        const diasRestantes = diasEntre(hoje, prazoFinal);
        const nota =
          diasRestantes >= 0
            ? `Exigência "${exigencia.descricao}" vence em ${diasRestantes} dia(s) (${prazoFinal.toLocaleDateString("pt-BR")}).`
            : `Exigência "${exigencia.descricao}" vencida há ${Math.abs(diasRestantes)} dia(s) (${prazoFinal.toLocaleDateString("pt-BR")}).`;

        await prisma.$transaction([
          prisma.lembrete.create({
            data: {
              protocoloId: exigencia.protocoloId,
              nota,
              origem: "PRAZO_EXIGENCIA",
              status: "PENDENTE",
            },
          }),
          prisma.exigencia.update({
            where: { id: exigencia.id },
            data: { alertaPrazoGeradoEm: hoje },
          }),
        ]);

        novosLembretes.push({
          empresa: exigencia.protocolo.empresa,
          numeroProtocolo: exigencia.protocolo.numeroProtocolo,
          nota,
        });
      }
    }

    if (novosLembretes.length > 0 && (usuario.settings?.notificarPorEmail ?? true)) {
      await sendLembretesDigest({ to: usuario.email, itens: novosLembretes });
    }

    resumo.push({ userId: usuario.id, gerados: novosLembretes.length });
  }

  return resumo;
}
