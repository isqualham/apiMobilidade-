-- Nenhum veículo existente é aprovado automaticamente.
CREATE TYPE "status_aprovacao_veiculo" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'SUSPENSO');
ALTER TABLE "veiculo" ADD COLUMN "status_aprovacao" "status_aprovacao_veiculo" NOT NULL DEFAULT 'PENDENTE', ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "veiculo_status_aprovacao_created_at_id_idx" ON "veiculo"("status_aprovacao", "created_at", "id");
CREATE TABLE "auditoria_veiculo" (
  "id" UUID NOT NULL,
  "veiculo_id" UUID NOT NULL,
  "autor_id" UUID NOT NULL,
  "acao" VARCHAR(30) NOT NULL,
  "status_anterior" "status_aprovacao_veiculo" NOT NULL,
  "status_novo" "status_aprovacao_veiculo" NOT NULL,
  "motivo" VARCHAR(1000) NOT NULL,
  "versao" INTEGER NOT NULL,
  "dados" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auditoria_veiculo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "auditoria_veiculo_veiculo_id_created_at_id_idx" ON "auditoria_veiculo"("veiculo_id", "created_at", "id");
ALTER TABLE "auditoria_veiculo" ADD CONSTRAINT "auditoria_veiculo_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "auditoria_veiculo" ADD CONSTRAINT "auditoria_veiculo_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- A migration anterior de disponibilidade é pré-requisito. Sem aprovação, não manter seleção Online.
UPDATE "prestador" SET "veiculo_online_id" = NULL, "disponibilidade_versao" = "disponibilidade_versao" + 1 WHERE "veiculo_online_id" IS NOT NULL;
