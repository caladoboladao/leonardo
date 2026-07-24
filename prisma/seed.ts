import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const STATUS_PADRAO = [
  { nome: "Em elaboração", cor: "#94a3b8", ordem: 0, isConcluido: false },
  { nome: "Protocolado", cor: "#3b82f6", ordem: 1, isConcluido: false },
  { nome: "Em exigência", cor: "#f59e0b", ordem: 2, isConcluido: false },
  { nome: "Deferido", cor: "#22c55e", ordem: 3, isConcluido: false },
  { nome: "Indeferido", cor: "#ef4444", ordem: 4, isConcluido: false },
  { nome: "Aguardando pagamento", cor: "#a855f7", ordem: 5, isConcluido: false },
  { nome: "Concluído", cor: "#16a34a", ordem: 6, isConcluido: true },
];

const ORGAOS_PADRAO = [
  "JUCEAL",
  "JUCEC",
  "Prefeitura de Maceió",
  "SEFAZ/AL",
  "Receita Federal",
];

const TIPOS_ATO_PADRAO = [
  "Contrato social",
  "Alteração contratual",
  "Transformação",
  "Abertura",
  "Baixa",
  "Reativação",
];

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const name = process.env.SEED_USER_NAME ?? null;

  if (!email || !password) {
    throw new Error(
      "Defina SEED_USER_EMAIL e SEED_USER_PASSWORD no .env antes de rodar o seed."
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name },
  });

  await prisma.settings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  for (const status of STATUS_PADRAO) {
    await prisma.status.upsert({
      where: { userId_nome: { userId: user.id, nome: status.nome } },
      update: {},
      create: { ...status, userId: user.id },
    });
  }

  for (const nome of ORGAOS_PADRAO) {
    await prisma.orgao.upsert({
      where: { userId_nome: { userId: user.id, nome } },
      update: {},
      create: { nome, userId: user.id },
    });
  }

  for (const nome of TIPOS_ATO_PADRAO) {
    await prisma.tipoAto.upsert({
      where: { userId_nome: { userId: user.id, nome } },
      update: {},
      create: { nome, userId: user.id },
    });
  }

  console.log(`Seed concluído para o usuário ${email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
