-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "colunasVisiveisProtocolos" JSONB,
ADD COLUMN     "importOrgaoIdPadrao" TEXT,
ADD COLUMN     "importStatusIdPadrao" TEXT,
ADD COLUMN     "importTipoAtoIdPadrao" TEXT,
ADD COLUMN     "notificarPorEmail" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_importStatusIdPadrao_fkey" FOREIGN KEY ("importStatusIdPadrao") REFERENCES "Status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_importOrgaoIdPadrao_fkey" FOREIGN KEY ("importOrgaoIdPadrao") REFERENCES "Orgao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_importTipoAtoIdPadrao_fkey" FOREIGN KEY ("importTipoAtoIdPadrao") REFERENCES "TipoAto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
