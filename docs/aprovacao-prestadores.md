# Aprovação administrativa de prestadores

## Endpoint

`PATCH /api/prestadores/{id}/aprovacao`

O parâmetro `id` é o UUID de **Prestador**, retornado por `POST /api/prestadores`,
e não o UUID de Usuario. O endpoint exige `Authorization: Bearer <JWT>` de uma
conta existente, ativa e com `administrador=true` no banco. Esta tarefa não cria
administradores, senhas ou mecanismo público para conceder esse privilégio.

Após autenticar a conta administrativa em `POST /api/auth/login`, use o token:

```sh
curl --request PATCH "$VIAU_BASE_URL/api/prestadores/$PRESTADOR_ID/aprovacao" \
  --header "Authorization: Bearer $TOKEN_ADMIN" \
  --header 'Content-Type: application/json' \
  --data '{"statusAprovacao":"APROVADO"}'
```

Para rejeitar, envie `{"statusAprovacao":"REJEITADO"}`. No Swagger (`/api-docs`),
autorize com o JWT e utilize a operação na seção Prestadores.

## Regras

- Reutiliza `StatusAprovacao` gerado pelo Prisma: PENDENTE, APROVADO, REJEITADO.
- Permite apenas PENDENTE → APROVADO ou PENDENTE → REJEITADO.
- O usuário vinculado ao prestador precisa estar ativo.
- Decisão já aplicada, inclusive repetição da mesma decisão, retorna 409.
- Não suspende prestador aprovado, reabre rejeitado nem interrompe corridas.
  Essas ações exigiriam regras próprias; não são parte deste endpoint.
- O corpo aceita somente `statusAprovacao`. Campos extras são rejeitados com 400.
- Permissão administrativa vem da consulta atual ao banco, nunca de campos no
  corpo ou da alegação `administrador` do JWT. O token identifica o usuário.
- O repositório revalida o administrador ativo, inclusive quando chamado fora
  da API, antes de alterar o cadastro.
- Consulta e escrita usam transação com atualização condicional de PENDENTE.
  Duas decisões concorrentes não sobrescrevem uma à outra: uma vence e outra
  recebe 409. Conflitos Prisma P2034/P2025 também viram 409.
- Prestadores PENDENTES e REJEITADOS continuam bloqueados no aceite de corridas,
  tanto pela rota quanto pela verificação do repositório de corridas.

## Respostas

200 retorna `mensagem` e `prestador`, contendo somente `id`, `usuarioId`,
`statusAprovacao` e `updatedAt`. Não retorna senha, documentos ou perfil completo.

| HTTP | Situação |
| --- | --- |
| 400 | UUID, JSON, decisão inválida ou campos extras. |
| 401 | Token ausente/inválido/expirado; usuário inexistente/inativo. |
| 403 | Usuário sem autorização administrativa atual. |
| 404 | Prestador inexistente. |
| 409 | Já avaliado, usuário do prestador inativo ou alteração concorrente. |
| 500 | Falha interna inesperada. |

Erros usam `{ "erro": "mensagem" }`, seguindo a rota existente de prestadores.

## Persistência e limitações

Nenhuma alteração no schema ou nas migrations. Grava `statusAprovacao` e o
`updatedAt` já existente. O schema não possui campos para motivo da rejeição,
identidade do avaliador ou histórico de decisões; esta tarefa não afirma manter
essa trilha de auditoria. Também não adiciona listagem administrativa de pendentes:
é necessário conhecer o ID do cadastro recebido no fluxo de inscrição.

## Testes

```sh
npm test
npx tsc --noEmit --incremental false
npm run lint
TEST_DATABASE_URL=postgresql://usuario:senha@localhost:5432/viau_test npm run test:integration
```

Os testes de autorização verificam JWTs assinados com segredo aleatório de teste
e simulam a consulta de usuário. Os testes de integração usam PostgreSQL de testes,
schemas aleatórios e as migrations existentes, sem carregar `.env` ou usar
`DATABASE_URL` do projeto. Ao fim, removem somente os schemas criados para os testes.
Cobrem decisões, conflitos concorrentes, autorização no repositório e o fluxo
pendente → bloqueio no aceite → aprovado → aceite permitido.
