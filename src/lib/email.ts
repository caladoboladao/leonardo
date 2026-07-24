import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendLembretesDigest(params: {
  to: string;
  itens: { empresa: string; numeroProtocolo: string | null; nota: string }[];
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY não configurado — e-mail de lembretes não enviado.");
    return;
  }
  if (params.itens.length === 0) return;

  const listaHtml = params.itens
    .map(
      (i) =>
        `<li><strong>${escapeHtml(i.empresa)}</strong>${
          i.numeroProtocolo ? ` (protocolo ${escapeHtml(i.numeroProtocolo)})` : ""
        }: ${escapeHtml(i.nota)}</li>`
    )
    .join("");

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Protocolos Societários <onboarding@resend.dev>",
    to: params.to,
    subject: `${params.itens.length} novo(s) lembrete(s) de protocolo`,
    html: `<p>Novos lembretes gerados automaticamente:</p><ul>${listaHtml}</ul>`,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
