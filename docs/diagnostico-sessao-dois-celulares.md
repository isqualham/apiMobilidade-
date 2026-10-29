> Histórico da política anterior de substituição. Para a política atual (segundo login retorna 409), consulte [sessão única](sessao-unica.md).

# Diagnóstico de sessão nos dois celulares

## Evidência local

A migration aplicada, informada pelo usuário, não comprova atualização do processo da API.
O login local usa AutenticarUsuarioUseCase → SessaoUseCase → PrismaSessaoRepository.criar.
A transação bloqueia a conta, revoga sessões anteriores e cria a nova. O guard consulta
sid + usuarioId no banco e rejeita revogação/expiração. JWT sem sid também é rejeitado.
Refresh não remove revogação; sessão OUTRO_LOGIN retorna 401. Logout antigo não altera
a sessão nova, disponibilidade nem corridas.

Não foi encontrado outro verificador de JWT nas rotas: TokenService é utilizado pelo
guard central; os endpoints SMS também usam esse guard. Rotas delegadas de corridas,
administração e veículos usam o mesmo mecanismo. Catálogos públicos não comprovam sessão.
Não há WebSocket ou endpoint de envio de localização implementado.

O teste tests/auth/dois-celulares.test.ts percorre as rotas reais de login, me, refresh
e logout, com assinatura JWT e senha reais e persistência simulada em memória. Executa
a sequência para passageiro e prestador. Não simula a decisão de revogação do repositório:
o próprio PrismaSessaoRepository executa as operações sobre o banco simulado.
Isso não substitui validação de concorrência ou execução contra PostgreSQL real.

## Ambiente

docker-compose.yaml local monta .:/api e executa npm run dev. Dockerfile apenas prepara
dependências e copia fontes; não comprova qual imagem/build está implantado remotamente.
A inspeção dos containers foi impedida por acesso negado ao socket Docker. Não foi
consultado Neon nem executada migration. Não houve identificação da URL/build efetivamente
utilizados pelos celulares. Não há evidência suficiente para atribuir o incidente a
deploy antigo, App ou banco divergente.

## Validação decisiva

1. Confirmar a mesma URL base da API nos dois celulares, inclusive esquema, host e porta.
2. Fazer login A e consultar GET /api/auth/me com Bearer de A: esperado 200.
3. Fazer login B com a mesma conta. Ambos os logins devem retornar o mesmo id de usuário.
   B retornar 200 no login é esperado: ele substitui A.
4. Sem repetir login A e sem trocar seus tokens pelos de B, chamar /api/auth/me com o
   access token original de A: esperado 401 e erro "Sua conta foi acessada em outro dispositivo.".
5. POST /api/auth/refresh com {"refreshToken":"REFRESH_ORIGINAL_A"}: esperado o mesmo 401.
6. /api/auth/me com token de B: esperado 200. Reabrir B com os tokens armazenados não
   deve executar login novamente.
7. Não usar tela inicial, mapa, dados em cache ou catálogo público como prova de sessão.

Não publicar tokens, senhas ou URLs de conexão. Para comparar JWTs, analisar localmente
sub e sid: sub deve coincidir; sid deve mudar entre logins. Não enviar tokens a sites
de decodificação. Se ambos tiverem o mesmo sid, não foram observados dois logins novos
independentes com o fluxo atual, ou houve reutilização/troca de credenciais no cliente.

Interpretação:
- A me=401, refresh=401, B me=200: backend aplica sessão única; investigar apenas estado
  visual/interceptor do App se A continuar exibindo tela autenticada.
- A me=200 mas refresh=401: investigar guard/build efetivamente servido e cache intermediário.
- A me=200 e refresh=200: investigar conta distinta, URL/banco distintos, instâncias antigas
  ou revogação ausente na versão implantada. Não assumir qual sem observar as respostas.
- A e B alternam expulsões: verificar se o App repete login automaticamente em vez de refresh.

Uma nova requisição é necessária para A detectar substituição: não há push de logout.
Operações já autorizadas antes da revogação podem terminar. Nenhuma corrida deve ser
cancelada nem a disponibilidade alterada para executar este diagnóstico.
