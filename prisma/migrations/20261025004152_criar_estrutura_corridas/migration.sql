-- CreateEnum
CREATE TYPE "status_corrida" AS ENUM ('SOLICITADA', 'ACEITA', 'PRESTADOR_A_CAMINHO', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA', 'ENCERRADA_ANTECIPADAMENTE');

-- CreateEnum
CREATE TYPE "tipo_responsavel_cancelamento" AS ENUM ('PASSAGEIRO', 'PRESTADOR', 'ADMINISTRADOR');

-- CreateTable
CREATE TABLE "tipo_veiculo" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "descricao" VARCHAR(255),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tipo_veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria_veiculo" (
    "id" UUID NOT NULL,
    "tipo_veiculo_id" UUID NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" VARCHAR(255),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem_exibicao" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "categoria_veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifa_categoria" (
    "id" UUID NOT NULL,
    "categoria_veiculo_id" UUID NOT NULL,
    "valor_km" DECIMAL(10,2) NOT NULL,
    "tarifa_minima" DECIMAL(10,2) NOT NULL,
    "taxa_partida" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tarifa_categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculo" (
    "id" UUID NOT NULL,
    "prestador_id" UUID NOT NULL,
    "categoria_veiculo_id" UUID NOT NULL,
    "placa" VARCHAR(10) NOT NULL,
    "marca" VARCHAR(80) NOT NULL,
    "modelo" VARCHAR(100) NOT NULL,
    "ano" INTEGER NOT NULL,
    "cor" VARCHAR(50),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrida" (
    "id" UUID NOT NULL,
    "passageiro_id" UUID NOT NULL,
    "prestador_id" UUID,
    "veiculo_id" UUID,
    "categoria_veiculo_id" UUID NOT NULL,
    "status" "status_corrida" NOT NULL DEFAULT 'SOLICITADA',
    "origem_endereco" VARCHAR(500) NOT NULL,
    "origem_latitude" DECIMAL(10,7) NOT NULL,
    "origem_longitude" DECIMAL(10,7) NOT NULL,
    "destino_endereco" VARCHAR(500) NOT NULL,
    "destino_latitude" DECIMAL(10,7) NOT NULL,
    "destino_longitude" DECIMAL(10,7) NOT NULL,
    "distancia_km" DECIMAL(10,3) NOT NULL,
    "valor_km_aplicado" DECIMAL(10,2) NOT NULL,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "distancia_percorrida_km" DECIMAL(10,3),
    "valor_final_cobrado" DECIMAL(10,2),
    "data_aceite" TIMESTAMPTZ(3),
    "data_inicio" TIMESTAMPTZ(3),
    "data_finalizacao" TIMESTAMPTZ(3),
    "data_cancelamento" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "corrida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancelamento_corrida" (
    "id" UUID NOT NULL,
    "corrida_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "tipo_responsavel" "tipo_responsavel_cancelamento" NOT NULL,
    "motivo" VARCHAR(150) NOT NULL,
    "descricao" VARCHAR(500),
    "encerramento_antecipado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancelamento_corrida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localizacao_corrida" (
    "id" UUID NOT NULL,
    "corrida_id" UUID NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "precisao_metros" DECIMAL(10,2),
    "velocidade_ms" DECIMAL(10,2),
    "registrado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "localizacao_corrida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipo_veiculo_nome_key" ON "tipo_veiculo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_veiculo_nome_key" ON "categoria_veiculo"("nome");

-- CreateIndex
CREATE INDEX "categoria_veiculo_tipo_veiculo_id_idx" ON "categoria_veiculo"("tipo_veiculo_id");

-- CreateIndex
CREATE UNIQUE INDEX "tarifa_categoria_categoria_veiculo_id_key" ON "tarifa_categoria"("categoria_veiculo_id");

-- CreateIndex
CREATE UNIQUE INDEX "veiculo_placa_key" ON "veiculo"("placa");

-- CreateIndex
CREATE INDEX "veiculo_prestador_id_idx" ON "veiculo"("prestador_id");

-- CreateIndex
CREATE INDEX "veiculo_categoria_veiculo_id_idx" ON "veiculo"("categoria_veiculo_id");

-- CreateIndex
CREATE INDEX "corrida_passageiro_id_created_at_idx" ON "corrida"("passageiro_id", "created_at");

-- CreateIndex
CREATE INDEX "corrida_prestador_id_status_idx" ON "corrida"("prestador_id", "status");

-- CreateIndex
CREATE INDEX "corrida_categoria_veiculo_id_status_idx" ON "corrida"("categoria_veiculo_id", "status");

-- CreateIndex
CREATE INDEX "corrida_status_created_at_idx" ON "corrida"("status", "created_at");

-- CreateIndex
CREATE INDEX "cancelamento_corrida_corrida_id_idx" ON "cancelamento_corrida"("corrida_id");

-- CreateIndex
CREATE INDEX "cancelamento_corrida_usuario_id_idx" ON "cancelamento_corrida"("usuario_id");

-- CreateIndex
CREATE INDEX "cancelamento_corrida_tipo_responsavel_created_at_idx" ON "cancelamento_corrida"("tipo_responsavel", "created_at");

-- CreateIndex
CREATE INDEX "localizacao_corrida_corrida_id_registrado_em_idx" ON "localizacao_corrida"("corrida_id", "registrado_em");

-- AddForeignKey
ALTER TABLE "categoria_veiculo" ADD CONSTRAINT "categoria_veiculo_tipo_veiculo_id_fkey" FOREIGN KEY ("tipo_veiculo_id") REFERENCES "tipo_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifa_categoria" ADD CONSTRAINT "tarifa_categoria_categoria_veiculo_id_fkey" FOREIGN KEY ("categoria_veiculo_id") REFERENCES "categoria_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_prestador_id_fkey" FOREIGN KEY ("prestador_id") REFERENCES "prestador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculo" ADD CONSTRAINT "veiculo_categoria_veiculo_id_fkey" FOREIGN KEY ("categoria_veiculo_id") REFERENCES "categoria_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrida" ADD CONSTRAINT "corrida_passageiro_id_fkey" FOREIGN KEY ("passageiro_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrida" ADD CONSTRAINT "corrida_prestador_id_fkey" FOREIGN KEY ("prestador_id") REFERENCES "prestador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrida" ADD CONSTRAINT "corrida_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrida" ADD CONSTRAINT "corrida_categoria_veiculo_id_fkey" FOREIGN KEY ("categoria_veiculo_id") REFERENCES "categoria_veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancelamento_corrida" ADD CONSTRAINT "cancelamento_corrida_corrida_id_fkey" FOREIGN KEY ("corrida_id") REFERENCES "corrida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancelamento_corrida" ADD CONSTRAINT "cancelamento_corrida_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "localizacao_corrida" ADD CONSTRAINT "localizacao_corrida_corrida_id_fkey" FOREIGN KEY ("corrida_id") REFERENCES "corrida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
