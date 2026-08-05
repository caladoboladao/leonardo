-- AlterTable
ALTER TABLE "Protocolo" ADD COLUMN     "dataConclusao" TIMESTAMP(3);

-- Backfill: protocolos já concluídos usam a última mudança de status como
-- estimativa retroativa da data de conclusão.
UPDATE "Protocolo" p
SET "dataConclusao" = p."ultimaMudancaStatusEm"
FROM "Status" s
WHERE s.id = p."statusId" AND s."isConcluido" = true AND p."dataConclusao" IS NULL;
