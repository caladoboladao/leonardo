-- CreateEnum
CREATE TYPE "OrigemTarefa" AS ENUM ('MANUAL', 'MODELO');

-- CreateEnum
CREATE TYPE "GatilhoModeloTarefa" AS ENUM ('CRIACAO', 'CONCLUSAO');

-- CreateTable
CREATE TABLE "Tarefa" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prazo" TIMESTAMP(3),
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "dataConclusao" TIMESTAMP(3),
    "protocoloId" TEXT,
    "empresaId" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "origem" "OrigemTarefa" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarefa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeloTarefa" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoAtoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prazoDiasRelativo" INTEGER,
    "gatilho" "GatilhoModeloTarefa" NOT NULL DEFAULT 'CRIACAO',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeloTarefa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tarefa_userId_concluida_prazo_idx" ON "Tarefa"("userId", "concluida", "prazo");

-- CreateIndex
CREATE INDEX "Tarefa_protocoloId_idx" ON "Tarefa"("protocoloId");

-- CreateIndex
CREATE INDEX "Tarefa_empresaId_idx" ON "Tarefa"("empresaId");

-- CreateIndex
CREATE INDEX "ModeloTarefa_userId_tipoAtoId_gatilho_ordem_idx" ON "ModeloTarefa"("userId", "tipoAtoId", "gatilho", "ordem");

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "Protocolo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarefa" ADD CONSTRAINT "Tarefa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeloTarefa" ADD CONSTRAINT "ModeloTarefa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeloTarefa" ADD CONSTRAINT "ModeloTarefa_tipoAtoId_fkey" FOREIGN KEY ("tipoAtoId") REFERENCES "TipoAto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
