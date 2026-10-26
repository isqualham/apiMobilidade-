# Sessões e refresh tokens — ViaU

## Contratos

Todas as chamadas usam HTTPS em implantação. Nunca colocar tokens em URL ou logs.

`POST /api/auth/login` mantém entrada `{ "email": "...", "senha": "..." }` e os campos de resposta `id`, `nome`, `email`, `administrador`, `prestador`, `statusAprovacao`, `telefoneVerificado`, `token`. Adiciona `refreshToken`. `token` continua sendo o access JWT (1 hora). Login bem-sucedido cria uma sessão independente e responde 200 com `Cache-Control: no-store`.

`POST /api/auth/refresh` não exige Bearer (o access pode estar expirado):

```json
{ "refreshToken": "<token opaco de 43 caracteres recebido do backend>" }
```

200:

```json
{ "token": "<novo JWT>", "refreshToken": "<novo token opaco>" }
```

`POST /api/auth/logout` recebe o mesmo corpo e retorna 204 sem corpo. Revoga apenas a sessão correspondente, inclusive quando o token informado já foi rotacionado. Tokens bem formados desconhecidos/revogados também retornam 204 (idempotência).

Refresh/logout rejeitam campos extras (incluindo usuário/permissões). JSON ou formato inválido: 400. Refresh desconhecido, expirado, revogado, reutilizado ou de usuário inativo: 401, `{ "erro": "Refresh token inválido, expirado ou revogado." }`. Falha interna: 500 com mensagem genérica. Respostas de refresh/logout não são cacheáveis. Não há cookies ou dependência de access token nesses endpoints.

## Banco e concorrência

Migration versionada: `20261026010000_sessoes_refresh`.

- `sessao_auth`: usuário, expiração, revogação e datas. Uma sessão por login.
- `refresh_token`: hash SHA-256 único, sessão, expiração e data de consumo. Nunca persiste o token original.
- Tokens gerados com 32 bytes aleatórios criptográficos, codificados em base64url (256 bits).
- Cada token vence 7 dias após emissão. Rotação renova o prazo da sessão por 7 dias; não há prazo absoluto adicional.
- O histórico de hashes é mantido para detectar replay mesmo após a emissão de vários sucessores.
- Transação ReadCommitted executa UPDATE da sessão para adquirir lock PostgreSQL; só depois relê o token e marca seu uso. O lock funciona entre processos/instâncias.
- Reutilização revoga a sessão e confirma a transação antes de devolver 401. Não lançar erro dentro dessa transação, pois desfaria a revogação.
- Duas renovações do mesmo token: no máximo uma vence; a segunda detecta replay e revoga a sessão, inclusive os tokens da vencedora. Não há janela de tolerância.
- Logout usa o mesmo lock de atualização da sessão. Corrida entre logout e refresh nunca reabre a sessão.
- Falhas transacionais não produzem tokens de sucesso; o banco reverte alterações incompletas.

JWTs novos carregam `sid` (sessão) e `jti` (identificador de emissão). Rotas protegidas verificam a sessão e a identidade, além do JWT e do usuário ativo. Revogação invalida os access tokens novos da sessão. Permissões continuam consultadas no banco.

JWTs legados sem `sid` continuam aceitos até sua expiração original (no máximo 1 hora após implantação). Não possuem sessão revogável nem refresh retroativo; requerem novo login.

Nenhuma operação de sessão modifica corridas, tarifas, OSRM ou aprovação. Nova autenticação permite recuperar a corrida por `GET /api/corrida/ativa?papel=passageiro` ou `papel=prestador`.

## Implantação

Aplicar a migration antes de publicar o código que a utiliza. Não usar `db push`. Em ambiente autorizado:

```sh
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
```

Usar Node compatível com a versão instalada do Prisma (o Node 20.14 local é antigo e falha ao carregar a CLI; a validação desta tarefa usa o Node do runtime disponível). Conferir explicitamente a conexão do ambiente antes de deploy. Esta tarefa não aplica migrations em produção.

## Integração futura no Expo

1. Manter `token` como Bearer e guardar o par de tokens em armazenamento seguro do sistema operacional; evitar logs/telemetria e armazenamento em texto simples.
2. Centralizar refresh numa única Promise/mutex por sessão. Todas as requisições aguardam a mesma renovação; não iniciar refresh simultâneo para cada 401.
3. Enviar somente o refresh atual. Salvar o novo par antes de liberar requisições aguardando.
4. Repetir a chamada protegida no máximo uma vez após refresh. Não renovar recursivamente em falhas de login/refresh/logout; 403 não indica expiração.
5. Se refresh retornar 401, limpar a sessão local, pedir login e recuperar corrida ativa. Não cancelar corrida automaticamente.
6. Em timeout/resposta perdida de refresh, não repetir cegamente o token antigo: ele pode ter sido consumido. Nova autenticação é a recuperação segura.
7. Logout envia o refresh atual (sem exigir Bearer), depois remove credenciais locais. Se offline/falhar, a remoção local não confirma revogação no servidor.
8. Retentativas de comandos de corrida por falha de rede devem consultar o estado primeiro; refresh não adiciona idempotência aos comandos existentes.

## Testes e limitações

`npm test` inclui testes unitários/HTTP e validação OpenAPI. `TEST_DATABASE_URL=... npm run test:integration` cria schemas aleatórios, aplica migrations versionadas e testa PostgreSQL real. Nunca usar uma URL de produção como TEST_DATABASE_URL.

- Uma resposta de refresh perdida exige novo login; escolha deliberada para evitar replay tolerado.
- Verificação de sessão acrescenta uma consulta às rotas protegidas para JWTs novos.
- Não há limpeza automática do histórico. Uma rotina futura deve preservar hashes de sessões ainda válidas; remover hashes consumidos prematuramente elimina a detecção de replay.
- Não há limite absoluto de duração de uma sessão continuamente renovada.
- Não foram adicionados rate limiting distribuído, gestão de dispositivos ou logout de todas as sessões.
- Alteração de senha não revoga automaticamente todas as sessões nesta tarefa.
- Requisições já autorizadas antes da revogação podem terminar; revogar não interrompe trabalho em execução.
- TLS, sigilo de JWT_SECRET e exclusão de corpos/headers sensíveis nos logs de proxy/APM continuam responsabilidades da implantação.
