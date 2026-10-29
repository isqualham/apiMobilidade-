# Aprovação administrativa individual de veículos

A aprovação do veículo é independente de `ativo` e da aprovação do prestador. Todos os veículos novos iniciam PENDENTE. A migration também atribui PENDENTE aos veículos existentes; nenhum registro é aprovado automaticamente e a seed não concede aprovação. Imagem é opcional: cadastro aceita ausência ou null, e a aprovação não depende dela. Marca admite no máximo 80 caracteres.

## Contratos

Todos exigem Bearer JWT válido. Administradores são verificados no banco, inclusive dentro da transação. Dados de perfil/identidade enviados pelo cliente não autorizam operações. Respostas administrativas não têm cache.

- `GET /api/admin/veiculos?status=PENDENTE&limite=20`: lista administrativa. Filtro opcional status; sem filtro retorna todos. Resposta `{ "itens": [...], "proximoCursor": null }`; para continuar envie `cursor` retornado. Limite 1–50, ordem createdAt DESC, id DESC.
- `PATCH /api/admin/veiculos/{id}/aprovacao`: decisão administrativa sobre a versão efetivamente revisada.
- `GET /api/admin/veiculos/{id}/historico?limite=20`: histórico administrativo paginado, mesmo formato de página/cursor.
- `PATCH /api/veiculos/{id}`: edição parcial pelo proprietário, usuário ativo e prestador aprovado. Exige versão e ao menos um campo cadastral. Não permite informar aprovação, prestador ou identidade.
- `GET /api/veiculos`: continua listando os veículos próprios, inclusive pendentes/inativos, e agora retorna `statusAprovacao` e `versao`.

Decisão administrativa:

```json
{"statusAprovacao":"APROVADO","motivo":"Dados e documentos conferidos pela administração","versao":0}
```

A resposta é o veículo com status atualizado e versão incrementada. O motivo é obrigatório em toda decisão (5–1000 caracteres após trim). A versão vem da listagem; versão antiga, decisão repetida e transição inválida retornam 409. Não repetir automaticamente com uma versão nova sem revisar os dados novamente.

Transições administrativas:

| Origem | Destinos permitidos |
| --- | --- |
| PENDENTE | APROVADO, REJEITADO, SUSPENSO |
| APROVADO | SUSPENSO |
| REJEITADO | APROVADO, SUSPENSO |
| SUSPENSO | APROVADO, REJEITADO |

Para aprovar, veículo/categoria/tipo/usuário devem estar ativos e o prestador aprovado. Aprovação não ativa veículo nem coloca prestador Online automaticamente. Para retirar autorização de um veículo aprovado, use SUSPENSO com motivo. O retorno a APROVADO exige nova decisão administrativa.

Exemplo de edição pelo proprietário:

```json
{"versao":1,"modelo":"Modelo corrigido","imagemUrl":null}
```

Placa, categoria, marca, modelo, ano ou cor alterados fazem o veículo voltar a PENDENTE. SUSPENSO permanece SUSPENSO mesmo após edição, para impedir que uma suspensão seja removida pelo proprietário. Alterações somente em imagem ou `ativo` não concedem nem removem aprovação. Reativar um veículo rejeitado/suspenso não o autoriza. Campos omitidos são preservados; reenvio idêntico com versão atual não incrementa versão nem duplica auditoria.

O upload de foto existente permanece opcional e separado; imagem não é evidência usada na decisão automatizada, não é campo de reaprovação e não compõe o snapshot de dados relevantes. Não foi introduzida análise automática de documentos, propriedade, modelo ou ano.

## Autorização operacional e corridas

Online, consulta de ofertas e aceite exigem `statusAprovacao=APROVADO` no veículo, além de todas as validações anteriores: usuário ativo, prestador aprovado, propriedade, atividade do veículo/categoria/tipo, seleção Online e compatibilidade de categoria. A aprovação do prestador sozinha não basta.

Rejeição, suspensão, edição relevante ou desativação retiram a seleção Online e incrementam a versão de disponibilidade, na mesma transação. Isso também invalida comandos de disponibilidade de sessões com versão antiga. Após nova aprovação, o prestador precisa selecionar o veículo e ficar Online novamente.

Decisões administrativas não cancelam nem mudam corridas existentes. Mesmo suspenso, o veículo de uma corrida já aceita pode seguir pelos endpoints existentes de início, finalização, cancelamento ou encerramento antecipado, sujeitos às autorizações dessas rotas. Suspensão bloqueia novas ofertas/aceites. A edição cadastral por PATCH é bloqueada enquanto o veículo estiver vinculado a corrida ativa, preservando os dados da viagem.

Transações Serializable e versão do veículo protegem decisões concorrentes, edição versus aprovação e corrida versus edição. Em disputa entre aceite e suspensão, o aceite pode ter sido confirmado antes da suspensão; nesse caso a corrida existente é preservada. Um aceite posterior à suspensão é recusado.

## Auditoria

Cada decisão registra atomicamente veículo, autor autenticado, ação, status anterior/novo, motivo, versão resultante, data e snapshot dos campos relevantes. Edições cadastrais pelo proprietário também registram antes/depois e motivo técnico. Não há endpoint para editar ou excluir eventos. A integridade depende também das permissões do banco; isso não é um armazenamento inviolável contra administradores do PostgreSQL.

Respostas: 400 dados inválidos; 401 autenticação inválida; 403 falta de administração (ou inelegibilidade nos fluxos operacionais); 404 veículo inexistente/não acessível ao proprietário; 409 versão antiga, conflito, corrida ativa ou decisão inválida; 500 falha interna. Detalhes exatos por rota estão no Swagger.

## Migration e aplicação manual no Neon

Arquivo: `prisma/migrations/20261027020000_aprovacao_veiculos/migration.sql`.

Adiciona enum exclusivo do veículo (incluindo SUSPENSO), status padrão PENDENTE, versão, tabela de auditoria e índices/chaves estrangeiras. Remove seleções Online existentes, sem alterar corridas, contas ou tarifas. Depende da migration anterior de disponibilidade. Não aplica aprovação retroativa nem inventa decisões administrativas para veículos antigos.

**A migration não foi executada nesta tarefa.** A aplicação no Neon é manual, com a conexão correta e revisão das migrations pendentes. Após autorização operacional, o comando Prisma do projeto é `prisma migrate deploy --config prisma7.config.ts`, usando a versão instalada e Node compatível. Ele aplica todas as migrations pendentes, não somente esta. Não usar db push ou reset. A API com este código exige as novas colunas/tabela antes de ser disponibilizada.

Prisma Client gerado localmente; geração não modifica banco. Testes unitários, autorização e OpenAPI são executáveis sem banco. Testes PostgreSQL foram preparados/atualizados, mas não executados porque a preparação aplica migrations. Validar concorrência real em ambiente isolado antes da implantação; nenhuma conexão com Neon foi feita nesta tarefa.
