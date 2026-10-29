CREATE TABLE "recusa_oferta" (
  "prestador_id" UUID NOT NULL,
  "corrida_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recusa_oferta_pkey" PRIMARY KEY ("prestador_id", "corrida_id")
);
CREATE INDEX "recusa_oferta_corrida_id_idx" ON "recusa_oferta"("corrida_id");
ALTER TABLE "recusa_oferta" ADD CONSTRAINT "recusa_oferta_prestador_id_fkey" FOREIGN KEY ("prestador_id") REFERENCES "prestador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recusa_oferta" ADD CONSTRAINT "recusa_oferta_corrida_id_fkey" FOREIGN KEY ("corrida_id") REFERENCES "corrida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
