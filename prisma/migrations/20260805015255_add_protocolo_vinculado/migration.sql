-- CreateTable
CREATE TABLE "ProtocoloVinculado" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,

    CONSTRAINT "ProtocoloVinculado_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProtocoloVinculado" ADD CONSTRAINT "ProtocoloVinculado_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "Protocolo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
