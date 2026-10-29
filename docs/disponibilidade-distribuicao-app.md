# Disponibilidade e distribuição de corridas

## Auditoria e correções

O catálogo GET /api/categorias-veiculo lista categorias ativas, não oferta de prestadores.
Ele permanece disponível para cadastro de veículos. O App passageiro deve usar o novo
GET /api/categorias-veiculo/disponiveis, com Bearer JWT. Resposta:
`{"categorias":[{"id":"UUID","tipoVeiculoId":"UUID","nome":"Moto","descricao":null,"ordemExibicao":0}]}`.
Sem prestadores elegíveis retorna 200 com categorias vazias. Token inválido retorna 401.

A consulta exige prestador aprovado, conta ativa, veículo selecionado Online pertencente
ao prestador, veículo aprovado e ativo, categoria/tipo ativos e tarifa ativa.
Exclui o próprio usuário e prestadores com corrida ativa em qualquer papel.
Corridas ativas: SOLICITADA, ACEITA, PRESTADOR_A_CAMINHO e EM_ANDAMENTO.
Não retorna identidade, contato ou localização dos prestadores. A consulta é um snapshot,
não uma reserva nem promessa de aceite; a disponibilidade pode mudar imediatamente.

GET /api/corrida/disponiveis agora permite omitir veiculoId. Usa o veículo Online salvo
no servidor; quando enviado, o ID deve corresponder à seleção atual (caso contrário 403).
Preserva aprovação, propriedade, categoria/tipo ativos, bloqueio de prestador ocupado,
exclusão das recusas individuais, pedidos do próprio prestador e passageiros inativos.
Continua retornando apenas SOLICITADA sem prestador da categoria exata do veículo.
Não substitua categoriaVeiculoId por tipoVeiculoId. IDs de categorias distintas não são
intercambiáveis, mesmo quando pertencem ao mesmo tipo.

A exigência anterior de veiculoId podia retornar 400 quando o App omitisse o parâmetro.
Uma seleção desatualizada, Offline ou veículo pendente continua retornando 403.
Não foi inspecionado o App ou o ambiente remoto: não é possível atribuir todos os casos
relatados a uma causa única. Veículos pendentes não foram aprovados automaticamente.

## Logout e recuperação

POST /api/auth/logout recebe `{"refreshToken":"token-opaco-da-sessao"}`, sem precisar
de access token válido. Retorna 204. A primeira revogação da sessão e a retirada da
seleção Online são atômicas. A versão da disponibilidade é incrementada se estava Online.
A disponibilidade é global à conta: logout de uma sessão coloca o prestador Offline
em toda a conta. Com a política de sessão única, um novo login revoga o anterior;
a sessão atual precisa consultar o estado e selecionar Online explicitamente após seu logout. Repetir um logout já processado não remove uma
seleção Online posterior. Tokens desconhecidos não alteram disponibilidade.

Nenhuma corrida é cancelada, finalizada ou apagada no logout. Isso inclui SOLICITADA do
passageiro e corridas aceitas/em andamento do prestador. O logout pode deixar Offline
mesmo durante uma corrida; o PATCH normal de disponibilidade mantém suas restrições de
corrida ativa. Login não coloca Online automaticamente.

O App deve chamar logout antes de descartar os tokens e aguardar sucesso. Apagar apenas
o armazenamento local não altera o servidor. Em falha de rede, não apresentar a operação
como confirmada. Não há heartbeat: fechar/matar o App, perder rede ou expirar JWT não
equivale a logout e não altera automaticamente o estado persistido.

Após autenticar, consultar GET /api/corrida/ativa?papel=passageiro ou papel=prestador e,
para prestadores, GET /api/prestadores/disponibilidade. Uma corrida em busca retornada
após login é uma corrida real persistida, não um estado a apagar automaticamente.
O passageiro deve cancelar explicitamente pelo endpoint existente de cancelamento.
Corridas aceitas continuam recuperáveis após novo login. Manter o fluxo existente de
início/finalização; a seleção Online não é condição para finalizar uma corrida própria.

## Ajustes no App

1. Seleção de categoria do passageiro: usar /api/categorias-veiculo/disponiveis e atualizar
   a lista ao retornar à tela; não inferir oferta a partir de veículos cadastrados.
2. Prestador: selecionar veículo próprio aprovado via PATCH /api/prestadores/disponibilidade,
   enviando a versão obtida no GET. Em 409 recarregar estado antes de nova tentativa.
3. Enquanto Online e livre, consultar /api/corrida/disponiveis por polling, com Bearer;
   veiculoId pode ser omitido. Ao trocar veículo, reiniciar cursor/paginação.
4. Exibir 401 como necessidade de renovação/login; 403 como inelegibilidade/seleção;
   409 como conflito/ocupação. Não converter esses erros silenciosamente em lista vazia.
5. Aceite mantém o corpo existente com veiculoId selecionado. Revalidar estado ao retomar
   o App e após logout em outra sessão. Descartar ofertas locais ao ficar Offline.
6. Recuperar corridas ativas nos dois papéis; oferecer cancelamento explícito ao passageiro.

Não há WebSocket, push ou GPS de prestadores neste fluxo. As ofertas são consultadas,
não enviadas espontaneamente. Disponibilidade não filtra distância geográfica. Essas
melhorias e integração das telas ficam pendentes. Não foram alterados schema, migrations,
App ou dados; nenhuma conexão com Neon foi utilizada.
