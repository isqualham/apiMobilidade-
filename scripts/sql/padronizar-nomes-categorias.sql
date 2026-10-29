-- EXECUÇÃO MANUAL, não é migration nem seed. Conferir o banco selecionado.
-- Só altera categoria_veiculo.nome. Preserva IDs, updated_at e todos os demais campos.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE categoria_veiculo IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE viau_nomes_categorias ON COMMIT DROP AS
WITH nomes(destino, aliases) AS (VALUES
  ('Moto', ARRAY['moto', 'viau moto']),
  ('Carro Econômico', ARRAY['carro economico', 'economico', 'viau economico', 'viau carro economico']),
  ('Carro Premium', ARRAY['carro premium', 'conforto', 'viau conforto', 'premium', 'viau premium', 'viau carro premium']),
  ('Carro Porta-Malas Grande', ARRAY['carro porta-malas grande', 'executivo', 'viau executivo', 'porta-malas grande', 'viau porta-malas grande', 'viau carro porta-malas grande'])
)
SELECT c.id, c.nome AS anterior, n.destino
FROM categoria_veiculo c
JOIN nomes n ON translate(
  lower(btrim(regexp_replace(c.nome, '[[:space:]]+', ' ', 'g'))),
  'áàâãäéèêëíìîïóòôõöúùûüç',
  'aaaaaeeeeiiiiooooouuuuc'
) = ANY(n.aliases);

DO $$
BEGIN
  IF EXISTS (SELECT destino FROM viau_nomes_categorias GROUP BY destino HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Categorias equivalentes duplicadas. Nenhuma renomeação aplicada; revisar IDs e relacionamentos manualmente.';
  END IF;
  IF (SELECT count(*) FROM viau_nomes_categorias) <> 4 THEN
    RAISE EXCEPTION 'Não foram identificadas exatamente as quatro categorias. Nenhuma categoria será criada; revisar os nomes existentes.';
  END IF;
END $$;

SELECT id, anterior, destino FROM viau_nomes_categorias ORDER BY destino;
UPDATE categoria_veiculo c
SET nome = p.destino
FROM viau_nomes_categorias p
WHERE c.id = p.id AND c.nome IS DISTINCT FROM p.destino
RETURNING c.id, c.nome;
COMMIT;
