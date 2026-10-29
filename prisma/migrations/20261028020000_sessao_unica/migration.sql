-- Aplicação manual. Atualizar todos os processos da API em conjunto.
ALTER TABLE "sessao_auth" ADD COLUMN "motivo_revogacao" VARCHAR(32);
-- Preserva a sessão mais recente por conta e revoga excedentes antes da restrição.
WITH ordenadas AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "usuario_id" ORDER BY "created_at" DESC, "id" DESC
  ) AS posicao FROM "sessao_auth" WHERE "revogada_em" IS NULL
)
UPDATE "sessao_auth" AS s
SET "revogada_em" = CURRENT_TIMESTAMP, "motivo_revogacao" = 'OUTRO_LOGIN'
FROM ordenadas o WHERE s."id" = o."id" AND o.posicao > 1;
CREATE UNIQUE INDEX "sessao_auth_usuario_nao_revogada_key"
ON "sessao_auth" ("usuario_id") WHERE "revogada_em" IS NULL;
