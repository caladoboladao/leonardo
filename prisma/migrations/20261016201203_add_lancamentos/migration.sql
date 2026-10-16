-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('TAXA', 'HONORARIO');

-- CreateEnum
CREATE TYPE "SituacaoLancamento" AS ENUM ('A_PAGAR', 'PAGO', 'A_FATURAR', 'FATURADO', 'RECEBIDO');

-- CreateTable
CREATE TABLE "Lancamento" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3),
    "dataPagamento" TIMESTAMP(3),
    "situacao" "SituacaoLancamento" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lancamento_protocoloId_idx" ON "Lancamento"("protocoloId");

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "Protocolo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
