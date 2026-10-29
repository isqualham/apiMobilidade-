# Padronização dos nomes das categorias

Os endpoints de catálogo e disponibilidade leem categoria_veiculo.nome do PostgreSQL.
Não existe enum de nomes no backend. scripts/seed/dados.ts define os nomes e aliases
usados pela seed; scripts/seed/categorias.ts reutiliza os registros reconhecidos por ID.
O conteúdo atual do Neon não foi consultado.

| Categoria anterior (com ou sem ViaU) | Nome final | Perfil interno preservado |
| --- | --- | --- |
| Moto | Moto | moto |
| Econômico | Carro Econômico | economico |
| Conforto | Carro Premium | conforto |
| Executivo | Carro Porta-Malas Grande | executivo |

Premium e Porta-Malas Grande já cadastrados também são reconhecidos, com ou sem Carro
e ViaU. A seed normaliza acentos, caixa e espaços para encontrar aliases, mas persiste
os nomes finais exatamente como acima. Nomes antigos ficam somente como aliases de
compatibilidade, não como nomes de novas categorias. Não foram alteradas descrições,
aprovações ou exigências de veículo: o novo rótulo não cria requisito de porta-malas.

## Banco existente — execução manual

Executar somente scripts/sql/padronizar-nomes-categorias.sql, no banco/schema previamente
conferido pelo operador. Nenhum comando foi executado nesta tarefa. Não executar seed,
migration, db push ou reset para esta renomeação.

O SQL usa uma transação, bloqueia escritas concorrentes na tabela durante a operação e
identifica as quatro categorias por aliases conhecidos. Se alguma faltar ou houver dois
registros equivalentes (por exemplo Moto e ViaU Moto), aborta toda a transação. Não funde,
remove nem cria categorias. Nesse caso, revisar os IDs/relacionamentos antes de preparar
uma decisão específica; não apagar registros para forçar a execução. Após erro, efetuar
ROLLBACK se o cliente SQL mantiver a transação aberta.

O script mostra o mapeamento e atualiza somente nome. Preserva ID, tarifas, tipo, ativo,
ordem de exibição, descrição, updated_at e relacionamentos. Repetir após sucesso produz
zero alterações. Categorias personalizadas fora do mapeamento permanecem intactas.
A tabela temporária existe apenas durante a transação.

A seed segue exclusivamente manual e restrita a desenvolvimento. Seus perfis e IDs
reservados não foram renomeados para evitar mudanças em configurações tarifárias.

## App

Nenhuma alteração de contrato ou ID. Se exibe nome retornado pela API, basta atualizar
o catálogo/cache após a execução manual. Se possui rótulos fixos, atualizar somente os
textos. Usar categoriaVeiculoId para selecionar/cotar/solicitar, não comparar nomes.
Ícones e regras devem continuar associados aos IDs/tipos; não inferir requisitos novos
pelo nome. O App não foi inspecionado nem modificado.
