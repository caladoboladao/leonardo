-- CreateEnum
CREATE TYPE "OrigemLembrete" AS ENUM ('MANUAL', 'PRAZO_EXIGENCIA', 'PRAZO_ORGAO', 'PARADO_SEM_MOVIMENTACAO');

-- CreateEnum
CREATE TYPE "StatusLembrete" AS ENUM ('PENDENTE', 'RESOLVIDO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diasAlertaPrazo" INTEGER NOT NULL DEFAULT 5,
    "diasParado" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orgao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Orgao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoAto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipoAto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Status" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#6b7280',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "isConcluido" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Protocolo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "numeroProtocolo" TEXT,
    "orgaoId" TEXT,
    "tipoAtoId" TEXT,
    "statusId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "prazoDias" INTEGER,
    "dataVencimento" TIMESTAMP(3),
    "clienteResponsavel" TEXT,
    "observacoes" TEXT,
    "ultimaMudancaStatusEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Protocolo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpresaVinculada" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "EmpresaVinculada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistorico" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "statusAnteriorId" TEXT,
    "statusNovoId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lembrete" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nota" TEXT NOT NULL,
    "origem" "OrigemLembrete" NOT NULL DEFAULT 'MANUAL',
    "status" "StatusLembrete" NOT NULL DEFAULT 'PENDENTE',
    "emailEnviadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lembrete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Orgao_userId_nome_key" ON "Orgao"("userId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "TipoAto_userId_nome_key" ON "TipoAto"("userId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Status_userId_nome_key" ON "Status"("userId", "nome");

-- CreateIndex
CREATE INDEX "Protocolo_userId_statusId_idx" ON "Protocolo"("userId", "statusId");

-- CreateIndex
CREATE INDEX "Protocolo_userId_dataVencimento_idx" ON "Protocolo"("userId", "dataVencimento");

-- CreateIndex
CREATE INDEX "Lembrete_protocoloId_status_idx" ON "Lembrete"("protocoloId", "status");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orgao" ADD CONSTRAINT "Orgao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoAto" ADD CONSTRAINT "TipoAto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Status" ADD CONSTRAINT "Status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Protocolo" ADD CONSTRAINT "Protocolo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Protocolo" ADD CONSTRAINT "Protocolo_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "Orgao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Protocolo" ADD CONSTRAINT "Protocolo_tipoAtoId_fkey" FOREIGN KEY ("tipoAtoId") REFERENCES "TipoAto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Protocolo" ADD CONSTRAINT "Protocolo_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaVinculada" ADD CONSTRAINT "EmpresaVinculada_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "Protocolo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistorico" ADD CONSTRAINT "StatusHistorico_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "Protocolo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistorico" ADD CONSTRAINT "StatusHistorico_statusAnteriorId_fkey" FOREIGN KEY ("statusAnteriorId") REFERENCES "Status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistorico" ADD CONSTRAINT "StatusHistorico_statusNovoId_fkey" FOREIGN KEY ("statusNovoId") REFERENCES "Status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lembrete" ADD CONSTRAINT "Lembrete_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "Protocolo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
