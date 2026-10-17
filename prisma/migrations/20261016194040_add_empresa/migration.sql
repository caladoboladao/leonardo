-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "cnpj" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Empresa_userId_razaoSocial_idx" ON "Empresa"("userId", "razaoSocial");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_userId_cnpj_key" ON "Empresa"("userId", "cnpj");

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: adiciona empresaId opcional primeiro, pra poder popular os
-- protocolos já existentes antes de travar como obrigatório.
ALTER TABLE "Protocolo" ADD COLUMN "empresaId" TEXT;

-- Backfill: agrupa os protocolos existentes por CNPJ (quando houver) ou
-- pelo nome da empresa (quando não houver CNPJ), criando uma Empresa por
-- grupo e associando os protocolos a ela.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH chaves AS (
  SELECT
    p."id" AS protocolo_id,
    p."userId" AS user_id,
    p."empresa" AS empresa_nome,
    NULLIF(TRIM(p."cnpj"), '') AS cnpj_norm
  FROM "Protocolo" p
),
grupos AS (
  SELECT
    user_id,
    COALESCE(cnpj_norm, 'nome:' || TRIM(empresa_nome)) AS chave,
    (array_agg(empresa_nome ORDER BY protocolo_id))[1] AS razao_social,
    (array_agg(cnpj_norm ORDER BY protocolo_id) FILTER (WHERE cnpj_norm IS NOT NULL))[1] AS cnpj
  FROM chaves
  GROUP BY user_id, COALESCE(cnpj_norm, 'nome:' || TRIM(empresa_nome))
),
inseridas AS (
  INSERT INTO "Empresa" ("id", "userId", "razaoSocial", "cnpj", "createdAt", "updatedAt")
  SELECT gen_random_uuid()::text, user_id, razao_social, cnpj, now(), now()
  FROM grupos
  RETURNING "id" AS empresa_id, "userId" AS user_id, "razaoSocial" AS razao_social, "cnpj" AS cnpj
)
UPDATE "Protocolo" p
SET "empresaId" = i.empresa_id
FROM chaves c
JOIN inseridas i
  ON i.user_id = c.user_id
 AND (
      (c.cnpj_norm IS NOT NULL AND i.cnpj = c.cnpj_norm)
   OR (c.cnpj_norm IS NULL AND i.cnpj IS NULL AND TRIM(i.razao_social) = TRIM(c.empresa_nome))
 )
WHERE p."id" = c.protocolo_id;

-- Trava empresaId como obrigatório agora que todo protocolo já tem uma Empresa
ALTER TABLE "Protocolo" ALTER COLUMN "empresaId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Protocolo_userId_empresaId_idx" ON "Protocolo"("userId", "empresaId");

-- AddForeignKey
ALTER TABLE "Protocolo" ADD CONSTRAINT "Protocolo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
