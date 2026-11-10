-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'PRODUTOR');

-- AlterTable
ALTER TABLE "Laudo" ADD COLUMN     "origem" TEXT NOT NULL DEFAULT 'texto',
ADD COLUMN     "titulo" TEXT,
ADD COLUMN     "usuarioId" TEXT;

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'PRODUTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvaliacaoExportacao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "laudoId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "culturaId" TEXT NOT NULL,
    "embarque" TEXT,
    "docsConfirmados" TEXT[],
    "resultado" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvaliacaoExportacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvaliacaoCarbono" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "resultado" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvaliacaoCarbono_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "AvaliacaoExportacao_usuarioId_createdAt_idx" ON "AvaliacaoExportacao"("usuarioId", "createdAt");

-- CreateIndex
CREATE INDEX "AvaliacaoCarbono_usuarioId_createdAt_idx" ON "AvaliacaoCarbono"("usuarioId", "createdAt");

-- CreateIndex
CREATE INDEX "Laudo_usuarioId_createdAt_idx" ON "Laudo"("usuarioId", "createdAt");

-- AddForeignKey
ALTER TABLE "Laudo" ADD CONSTRAINT "Laudo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoExportacao" ADD CONSTRAINT "AvaliacaoExportacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoExportacao" ADD CONSTRAINT "AvaliacaoExportacao_laudoId_fkey" FOREIGN KEY ("laudoId") REFERENCES "Laudo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoExportacao" ADD CONSTRAINT "AvaliacaoExportacao_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Destino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoExportacao" ADD CONSTRAINT "AvaliacaoExportacao_culturaId_fkey" FOREIGN KEY ("culturaId") REFERENCES "Cultura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoCarbono" ADD CONSTRAINT "AvaliacaoCarbono_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

