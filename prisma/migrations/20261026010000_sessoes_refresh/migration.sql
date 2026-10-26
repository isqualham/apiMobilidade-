CREATE TABLE "sessao_auth" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "revogada_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "sessao_auth_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "refresh_token" (
    "id" UUID NOT NULL,
    "sessao_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expira_em" TIMESTAMPTZ(3) NOT NULL,
    "usado_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sessao_auth_usuario_id_idx" ON "sessao_auth"("usuario_id");
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");
CREATE INDEX "refresh_token_sessao_id_idx" ON "refresh_token"("sessao_id");
ALTER TABLE "sessao_auth" ADD CONSTRAINT "sessao_auth_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_sessao_id_fkey" FOREIGN KEY ("sessao_id") REFERENCES "sessao_auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
