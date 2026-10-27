# Disponibilidade do prestador

Disponibilidade é uma decisão do prestador, compartilhada por todas as sessões autenticadas da conta. Não representa conexão de rede, GPS ou presença confirmada. Logout, expiração de JWT e desconexão não alteram automaticamente esse estado; a autenticação continua obrigatória para consultar ofertas ou aceitar corridas.

## Contrato

Ambas as rotas exigem `Authorization: Bearer <access token>` e respondem com `Cache-Control: no-store`. A identidade vem exclusivamente da autenticação e do banco.

`GET /api/prestadores/disponibilidade`:

```json
{"status":"OFFLINE","veiculoId":null,"versao":0}
```

`PATCH /api/prestadores/disponibilidade` para ficar Online ou trocar o veículo:

```json
{"status":"ONLINE","veiculoId":"b12a0000-0000-4000-8000-000000000021","versao":0}
```

Resposta:

```json
{"status":"ONLINE","veiculoId":"b12a0000-0000-4000-8000-000000000021","versao":1}
```

Para ficar Offline:

```json
{"status":"OFFLINE","versao":1}
```

A resposta traz `veiculoId: null` e a nova versão. IDs de usuário/prestador e campos extras no corpo são rejeitados. Enviar `veiculoId` para Offline também é inválido. A versão deve ser um inteiro entre 0 e 2147483646. Respostas: 400 entrada inválida; 401 autenticação inválida/usuário inativo; 403 ausência de prestador, aprovação ou veículo elegível; 409 versão antiga, corrida ativa ou conflito concorrente; 500 falha interna.

## Regras

- Todos os prestadores existentes começam Offline quando a migration for aplicada; a seed não os coloca Online.
- Consultar o estado exige cadastro de prestador e usuário ativo. Prestadores pendentes/rejeitados podem consultar e ficar Offline, mas não ficar Online.
- Online exige APROVADO e veículo próprio ativo, categoria ativa e tipo ativo. Não existe homologação adicional por modelo/ano.
- Qualquer PATCH é bloqueado durante corrida SOLICITADA, ACEITA, PRESTADOR_A_CAMINHO ou EM_ANDAMENTO vinculada ao usuário como passageiro ou prestador, inclusive repetição do estado atual. Não é possível trocar de veículo ou ficar Offline durante a viagem.
- Sem corrida ativa, repetir estado/veículo com a versão atual é idempotente e não altera a versão.
- Troca de veículo é atômica e incrementa a versão. Cada sessão deve consultar e utilizar a versão atual. Requisição com versão antiga recebe 409, sem sobrescrever a escolha de outra sessão.
- Alteração e aceite usam transações Serializable. Uma disputa entre aceite e Offline/troca não pode confirmar os dois resultados incompatíveis; o perdedor recebe conflito ou recusa de elegibilidade conforme a ordem observada.
- Consulta de ofertas exige Online com exatamente o `veiculoId` da query; aceite exige o mesmo veículo selecionado. As validações anteriores de aprovação, atividade, categoria, ocupação e propriedade permanecem.
- A consulta de ofertas não reserva corrida nem garante disponibilidade futura. O aceite revalida no banco.
- Finalização, cancelamento e encerramento antecipado não são alterados. Após concluir a corrida, o prestador continua Online com o veículo selecionado e pode solicitar Offline usando a versão atual.
- O GET retorna a disponibilidade declarada; alterações cadastrais posteriores podem impedir novas ofertas/aceites mesmo que o estado declarado continue Online. Esses fluxos revalidam a elegibilidade.

## Aplicativo

Consultar veículos próprios pelo endpoint existente, consultar disponibilidade, enviar PATCH com a versão atual e o veículo escolhido. GET /api/veiculos ainda retorna todos os veículos próprios; o PATCH valida a elegibilidade no servidor. Usar o veículo retornado nas consultas de ofertas e no aceite. Em 409, consultar novamente disponibilidade e corrida ativa antes de decidir repetir, evitando retentativa automática que sobrescreva outra sessão.

## Banco e validação

Migration versionada: `prisma/migrations/20261027010000_disponibilidade_prestador/migration.sql`. Adiciona `veiculo_online_id` nullable com chave estrangeira para Veiculo e `disponibilidade_versao` com valor inicial 0. Null representa Offline, dispensando um boolean redundante. Não altera registros de corridas, tarifas ou credenciais.

A migration **não foi executada**. O código depende dessas colunas: não disponibilizar esta versão contra um banco sem a migration. O Prisma Client foi gerado localmente; geração não aplica migrations.

Os testes unitários cobrem validação, autorização JWT, idempotência, seleção, bloqueio por corrida, versões e tratamento de conflitos. Os testes PostgreSQL de concorrência e regressão foram preparados/atualizados, mas não executados nesta tarefa, pois sua preparação aplica migrations, ação expressamente não autorizada.
