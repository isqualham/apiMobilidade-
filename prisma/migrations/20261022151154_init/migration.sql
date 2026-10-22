-- CreateEnum
CREATE TYPE "status_aprovacao" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(20),
    "telefone_verificado" BOOLEAN NOT NULL DEFAULT false,
    "senha_hash" VARCHAR(255) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "administrador" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestador" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "status_aprovacao" "status_aprovacao" NOT NULL DEFAULT 'PENDENTE',
    "data_solicitacao" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "prestador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "termo_uso" (
    "id" UUID NOT NULL,
    "versao" VARCHAR(20) NOT NULL,
    "conteudo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "termo_uso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aceite_termo_uso" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "termo_uso_id" UUID NOT NULL,
    "data_aceite" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aceite_termo_uso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_cpf_key" ON "usuario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "prestador_usuario_id_key" ON "prestador"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "termo_uso_versao_key" ON "termo_uso"("versao");

-- CreateIndex
CREATE INDEX "aceite_termo_uso_usuario_id_idx" ON "aceite_termo_uso"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "aceite_termo_uso_usuario_id_termo_uso_id_key" ON "aceite_termo_uso"("usuario_id", "termo_uso_id");

-- AddForeignKey
ALTER TABLE "prestador" ADD CONSTRAINT "prestador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aceite_termo_uso" ADD CONSTRAINT "aceite_termo_uso_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aceite_termo_uso" ADD CONSTRAINT "aceite_termo_uso_termo_uso_id_fkey" FOREIGN KEY ("termo_uso_id") REFERENCES "termo_uso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
