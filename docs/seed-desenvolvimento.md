# Seed de desenvolvimento ViaU

## Auditoria e decisões

A Tarefa 13 amplia a seed da Tarefa 12 para quatro categorias. A conexão principal de desenvolvimento continua `db:5432/mobilidade_db`, schema `public`; esta tarefa foi validada exclusivamente em PostgreSQL descartável. A senha confirmada é `teste1234` (9 caracteres; os DTOs declaram mínimo de 8).

Usuário representa passageiro; não existe tabela Passageiro. Motorista é Usuario + Prestador APROVADO + Veiculo ativo em categoria/tipo ativos. Não existem campos de CNH, RENAVAM, documentação ou aprovação separada de veículo no schema atual. Não são inventados esses campos. CPF possui dígitos verificadores válidos; telefone segue +55/DDD/número. Estes dados são sintéticos, não comprovam titularidade: não enviar SMS, e-mail ou consultar serviços externos com eles.

Hash usa `gerarHashSenha` existente (bcrypt, custo 12); o banco nunca recebe senha em texto puro. `telefoneVerificado` fica falso: a seed não simula verificação SMS e essa flag não bloqueia corridas atualmente. Não cria administrador.

## Contas

Senha de desenvolvimento de todas: `teste1234`. O script não imprime senhas ou hashes.

| Conta | Perfil |
| --- | --- |
| passageiro1@teste.com.br | Passageiro ativo |
| passageiro2@teste.com.br | Passageiro ativo |
| motorista1@teste.com.br | Prestador ativo e APROVADO |
| motorista2@teste.com.br | Prestador ativo e APROVADO |

Os UUIDs, CPFs e telefones estáveis estão em `scripts/seed/dados.ts`. São registrados aceites das versões ativas de termos e política somente para estas contas sintéticas. Quando as tabelas estão vazias, os documentos simplificados são criados antes dos aceites. Documentos existentes inativos exigem revisão manual.

## Veículos e categorias

| Motorista | Categoria padrão | Veículo | Ano | Cor | Placa |
| --- | --- | --- | --- | --- | --- |
| motorista1 | Moto / tipo Moto | Honda CG 160 | 2024 | Preta | VUT1A01 |
| motorista2 | Carro Econômico / tipo Carro | Fiat Argo | 2024 | Prata | VUT2A02 |

São preparadas Moto, Carro Econômico, Carro Premium e Carro Porta-Malas Grande. Categorias antigas Moto, Econômico, Conforto e Executivo (inclusive com prefixo ViaU) são reconhecidas sem distinguir acentos, caixa ou espaços; somente o nome é padronizado, preservando IDs, estado, descrição e relacionamentos. Duplicidades equivalentes interrompem a transação: não há fusão automática.

Novas Moto e Carro Econômico ficam ativas e recebem os dois veículos acima. Novas Carro Premium e Carro Porta-Malas Grande ficam **inativas**, embora suas tarifas sejam preparadas, pois não há veículos de teste nem homologação definida para elas. Categorias existentes mantêm seu estado; Moto/Econômico inativas bloqueiam a seed. Tipos incompatíveis/inativos e IDs reservados ocupados também bloqueiam.

Para categorias equivalentes com nomes customizados, informar IDs auditados em `VIAU_SEED_MOTO_ID`, `VIAU_SEED_ECONOMICO_ID`, `VIAU_SEED_CONFORTO_ID` e `VIAU_SEED_EXECUTIVO_ID`. Esses nomes customizados são preservados; IDs informados devem existir e não podem conflitar com aliases encontrados. IDs novos estáveis constam em `scripts/seed/dados.ts`; IDs existentes sempre prevalecem.

## Tarifas provisórias de desenvolvimento

Criadas somente quando a categoria não possui tarifa:

| Categoria | Valor/km | Taxa de partida | Tarifa mínima |
| --- | --- | --- | --- |
| Moto | R$ 1,80 | R$ 3,00 | R$ 7,00 |
| Carro Econômico | R$ 2,50 | R$ 5,00 | R$ 10,00 |
| Carro Premium | R$ 3,50 | R$ 7,00 | R$ 15,00 |
| Carro Porta-Malas Grande | R$ 4,50 | R$ 10,00 | R$ 20,00 |

Valores persistidos como strings decimais em Decimal(10,2). Fórmula existente preservada: `max(tarifaMinima, taxaPartida + distanciaKm * valorKm)`, com Decimal e arredondamento HALF_UP para duas casas, limite R$ 99.999.999,99. Em 1 km aplicam-se as mínimas; em 10 km os totais são R$ 21,00 / 30,00 / 42,00 / 55,00. Distância vem do serviço de rotas no backend, nunca de um preço ou estimativa enviados pelo aplicativo. A seed não chama OSRM nem cria corridas.

Tarifas existentes são preservadas por padrão, inclusive as antigas da seed. Inativas/inválidas causam erro, sem reativação. O resumo mostra `acao`, `preservada`, valores efetivos, `updatedAt` e `valoresPropostos`. Estes valores não são tarifas comerciais definitivas.

## Atualização explícita de tarifas

O schema não possui marcador de origem. Um UUID reservado não comprova sozinho que um registro pertence à seed. Por isso não existe atualização automática de valores existentes. Um operador deve confirmar que o registro é de desenvolvimento, revisar o resumo da seed e autorizar cada tarifa pelo seu snapshot completo. Tarifas com IDs externos à seed nunca são atualizadas pelo script.

A variável opcional `VIAU_SEED_TARIFAS_ATUALIZAR` recebe um array JSON com os seis campos abaixo, sem campos extras. Copie `categoriaId` do resumo para `categoriaVeiculoId` e use o `updatedAt` e os valores **atuais**, não os propostos:

```json
[
  {
    "id": "b12a0000-0000-4000-8000-000000000031",
    "categoriaVeiculoId": "b12a0000-0000-4000-8000-000000000041",
    "updatedAt": "SUBSTITUIR_PELO_TIMESTAMP_ISO_ATUAL",
    "valorKm": "1.80",
    "tarifaMinima": "3.00",
    "taxaPartida": "3.00"
  }
]
```

O exemplo representa uma antiga tarifa Moto: substitua IDs e timestamp pelo resultado real revisado. Passe o JSON como variável somente nessa execução manual, acrescentando `-e 'VIAU_SEED_TARIFAS_ATUALIZAR=[...]'` ao comando Docker abaixo. Não mantenha autorização permanente no Compose ou `.env`.

O script compara ID, categoria, estado ativo, timestamp e valores dentro da transação Serializable antes de aplicar os valores da tabela acima. Snapshot desatualizado ou conflito causa rollback integral. Repetir a execução quando já estiver nos valores desejados preserva datas. Alterações manuais não são substituídas sem essa autorização; corridas registradas e seus valores não são recalculados.

## Elegibilidade e evolução

Reutilizados CategoriaVeiculo → TipoVeiculo, Veiculo → CategoriaVeiculo, TarifaCategoria única por categoria, aprovação do prestador, atividade do usuário/veículo/categoria/tipo e regras de ocupação e compatibilidade no aceite. Não há homologação documental de veículo nem atributos que comprovem conforto/padrão executivo. Marca, modelo e ano isolados não comprovam elegibilidade; definição administrativa de requisitos e verificação documental ficam pendentes antes de ativar as categorias superiores.

`GET /api/categorias-veiculo` e `GET /api/tarifas` listam configuração ativa, não disponibilidade de motoristas em tempo real. A seed prepara Moto/Econômico com prestadores aprovados e veículos ativos; não garante motorista online ou livre a qualquer instante. O Expo deve usar IDs retornados pela API, tratar ausência de ofertas e não exibir novas categorias superiores inativas como disponíveis.

Não existe cobrança por minuto no modelo atual e ela não foi ativada. Acrescentá-la futuramente exige decisão sobre duração estimada/efetiva, política de espera/encerramento, campo decimal de tarifa e snapshot aplicado à corrida, contratos e migration versionada. A duração do OSRM não é hoje uma cobrança por tempo. Nenhum schema, migration, endpoint ou contrato OpenAPI foi alterado nesta tarefa.

## Execução manual no Docker de desenvolvimento

Pré-requisitos: containers ativos, migrations já aplicadas, Prisma Client gerado, dependências de desenvolvimento instaladas. Nenhuma migration é executada pela seed. O runner `vite-node` já vem na árvore instalada do Vitest; nenhuma dependência foi adicionada.

Na pasta do projeto, somente quando houver autorização para gravar os dados de desenvolvimento:

```sh
docker compose exec -e NODE_ENV=development -e VIAU_ENVIRONMENT=development -e VIAU_SEED_CONFIRM=desenvolvimento api npm run seed:dev
```

A conexão continua sendo a do `.env` carregado pelo container, sem exibir credenciais. Não rodar esse comando em uma implantação de produção. O script bloqueia NODE_ENV ou VIAU_ENVIRONMENT diferentes de development (inclusive ausentes/test/produção), falta de confirmação e bancos/hosts fora da lista local permitida (`db`, `localhost`, `127.0.0.1`, `::1`; bancos `mobilidade_db` ou `viau_test`). Flags de ambiente não substituem isolamento operacional de produção.

Opcionalmente, `VIAU_SEED_PASSWORD` permite outra senha válida; não é impressa. Alterar essa variável não redefine a senha de contas já existentes: divergência interrompe a seed.

A execução é exclusivamente manual. Docker Compose inicia a API e não executa seed. O inicializador legado `scripts/init-dev.mjs` também não chama seeds, mesmo com `VIAU_AUTO_SEED=true`.

### Termos de Uso e Política de Privacidade

A seed prepara os documentos dentro da mesma transação, antes dos usuários e dos aceites. Em tabelas vazias, cria versão `1.0`, ativa, usando exatamente os exemplos do Swagger:

- Termos: `Termos e condições de uso do ViaU.`
- Política: `Política de privacidade do ViaU.`

Documentos ativos existentes são reutilizados sem alterar conteúdo, versão ou datas. Se existirem somente documentos inativos, a seed falha sem reativar ou substituir registros. Reexecuções não duplicam documentos ou aceites. Falhas posteriores revertem também documentos novos. São exemplos simplificados exclusivos de desenvolvimento; as proteções NODE_ENV, VIAU_ENVIRONMENT e confirmação continuam obrigatórias.

Para verificar, consultar `GET /api/termos-uso` e `GET /api/politica-privacidade` após a execução manual. Nenhuma migration é alterada ou executada pela seed.

## Idempotência e segurança

Transação Serializable: ou toda a seed é confirmada, ou nada é confirmado. UUIDs reservados estáveis, identidade e vínculos são conferidos antes de reutilizar registros. Conflitos de CPF, e-mail (inclusive caixa diferente), telefone, placa ou ID interrompem sem sobrescrever registros externos. Não há delete, redefinição de senha, reaprovação ou reativação automática.

Reexecuções comuns não alteram hashes ou tarifas; a primeira padronização de aliases altera somente o nome e a data da categoria. Atualização de tarifas exige a autorização explícita descrita acima. Se já houver corridas ativas nas contas, elas são preservadas e a quantidade é informada no resumo; a seed não limpa viagens para produzir um estado artificialmente vazio.

## Validação

```sh
npx tsc --noEmit --incremental false
npm run lint
npm test
TEST_DATABASE_URL='<PostgreSQL isolado>' npm run test:integration
```

Os testes usam schemas exclusivos num PostgreSQL descartável, migrations versionadas e fixtures de categorias/termos, sem usar o banco principal. Cobrem autenticação real das quatro contas, listagem dos veículos, elegibilidade para consulta de ofertas, idempotência, conflitos, preservação de tarifas e corridas e bloqueio de produção.


Para testar viagens reais após executar a seed, usar login, categorias, veículos e os endpoints de corrida existentes. OSRM e JWT_SECRET precisam estar configurados. O teste de fluxo completo usa PostgreSQL, repositórios, caso de uso de solicitação e adaptador HTTP OSRM reais; somente a resposta do provedor externo é uma fixture HTTP local. Isso valida persistência, cálculo, aceite, início e finalização, mas não valida um trajeto geográfico real no serviço público.

## Aprovação individual de veículos

Com a aprovação individual implementada, os veículos criados pela seed ficam PENDENTES por padrão e não podem operar até uma decisão administrativa explícita. A seed não altera aprovação de veículos existentes. Os prestadores continuam aprovados, mas isso não aprova seus veículos. Veja [aprovação de veículos](aprovacao-veiculos.md).

A renomeação de registros já existentes em ambiente remoto deve usar o [SQL manual de nomes](categorias-nomes.md), sem executar a seed completa. Os perfis internos conforto/executivo permanecem iguais para preservar tarifas e configurações.
