-- CreateEnum
CREATE TYPE "TipoEntidade" AS ENUM ('PRAGA', 'DOENCA', 'CULTURA');

-- CreateTable
CREATE TABLE "TermoNer" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoEntidade" NOT NULL,
    "termo" TEXT NOT NULL,

    CONSTRAINT "TermoNer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destino" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeEn" TEXT NOT NULL,

    CONSTRAINT "Destino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cultura" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeEn" TEXT NOT NULL,

    CONSTRAINT "Cultura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraExportacao" (
    "id" SERIAL NOT NULL,
    "destinoId" TEXT NOT NULL,
    "culturaId" TEXT NOT NULL,
    "maxDias" INTEGER NOT NULL,
    "bloqueios" TEXT[],
    "docs" TEXT[],

    CONSTRAINT "RegraExportacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bioma" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "reservaLegalMin" INTEGER NOT NULL,

    CONSTRAINT "Bioma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PraticaCarbono" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "fatorTco2eHaAno" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PraticaCarbono_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Laudo" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "numero" TEXT,
    "entidades" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Laudo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TermoNer_termo_key" ON "TermoNer"("termo");

-- CreateIndex
CREATE UNIQUE INDEX "RegraExportacao_destinoId_culturaId_key" ON "RegraExportacao"("destinoId", "culturaId");

-- AddForeignKey
ALTER TABLE "RegraExportacao" ADD CONSTRAINT "RegraExportacao_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Destino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegraExportacao" ADD CONSTRAINT "RegraExportacao_culturaId_fkey" FOREIGN KEY ("culturaId") REFERENCES "Cultura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
