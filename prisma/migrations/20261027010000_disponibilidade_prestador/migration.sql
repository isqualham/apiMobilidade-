-- Ausência de veículo selecionado representa OFFLINE. Registros existentes começam Offline.
ALTER TABLE "prestador"
  ADD COLUMN "veiculo_online_id" UUID,
  ADD COLUMN "disponibilidade_versao" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "prestador" ADD CONSTRAINT "prestador_veiculo_online_id_fkey"
  FOREIGN KEY ("veiculo_online_id") REFERENCES "veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
