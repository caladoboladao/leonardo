-- CreateEnum
CREATE TYPE "StatusTarefa" AS ENUM ('A_FAZER', 'EM_ANDAMENTO', 'CONCLUIDA');

-- AlterTable
ALTER TABLE "Tarefa" ADD COLUMN     "responsavel" TEXT,
ADD COLUMN     "status" "StatusTarefa" NOT NULL DEFAULT 'A_FAZER';

-- CreateIndex
CREATE INDEX "Tarefa_userId_status_idx" ON "Tarefa"("userId", "status");

-- Backfill: tarefas já concluídas (booleano existente) entram na coluna
-- "Concluída" do quadro; as demais ficam em "A fazer" (valor padrão da
-- coluna acima já cobre esse caso, não precisa de UPDATE pra elas).
UPDATE "Tarefa" SET "status" = 'CONCLUIDA' WHERE "concluida" = true;
