-- CreateEnum
CREATE TYPE "StatusExigencia" AS ENUM ('ABERTA', 'CUMPRIDA');

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "statusEmExigenciaId" TEXT;

-- CreateTable
CREATE TABLE "Exigencia" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descricao" TEXT NOT NULL,
    "prazoCumprimento" INTEGER NOT NULL DEFAULT 30,
    "dataCumprimento" TIMESTAMP(3),
    "numeroReprotocolo" TEXT,
    "status" "StatusExigencia" NOT NULL DEFAULT 'ABERTA',
    "alertaPrazoGeradoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exigencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exigencia_protocoloId_status_idx" ON "Exigencia"("protocoloId", "status");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_statusEmExigenciaId_fkey" FOREIGN KEY ("statusEmExigenciaId") REFERENCES "Status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exigencia" ADD CONSTRAINT "Exigencia_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "Protocolo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
