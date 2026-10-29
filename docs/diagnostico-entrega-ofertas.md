# Diagnóstico da entrega de ofertas

## Resultado da auditoria

No código atual, não foi demonstrado um defeito adicional na seleção de ofertas.
O veiculoId opcional já estava implementado antes desta auditoria.
A rota, o caso de uso e o repositório entregam uma oferta elegível nos testes com
Prisma simulado; isso não comprova os registros do ambiente onde o incidente ocorre.
Não foram consultados Neon, banco local ou App, nem executadas migrations.

O problema comprovado de diagnóstico era a ausência de eventos para diferenciar bloqueios
e consultas vazias. Além disso, exceções inesperadas eram registradas integralmente pelo
handler, podendo conter parâmetros SQL/dados privados. Para esta rota, esse registro foi
substituído por evento sanitizado de desenvolvimento. Nenhum filtro ou contrato HTTP foi
afrouxado ou alterado.

## Condições verificadas

- Online real é Prestador.veiculoOnlineId não nulo. A resposta do GET de disponibilidade
  representa essa seleção persistida, não a garantia de elegibilidade atual.
- Prestador APROVADO e usuário ativo. Autenticação JWT e sessão válidas.
- Veículo selecionado deve pertencer ao prestador, ser ativo e APROVADO.
- Categoria do veículo e seu tipo devem estar ativos.
- Se veiculoId for enviado, deve coincidir com a seleção Online.
- Uma corrida vinculada ao prestador com SOLICITADA, ACEITA, PRESTADOR_A_CAMINHO ou
  EM_ANDAMENTO bloqueia a consulta com 409.
- A oferta deve estar SOLICITADA, sem prestador atribuído, pertencer a outro passageiro
  ativo e ter categoriaVeiculoId exatamente igual ao veículo selecionado.
- Recusa individual exclui a corrida somente para o prestador que a recusou.
- Cursor restringe a busca a registros posteriores à sua data/ID. Não reutilizar cursor
  de uma seleção anterior nem tratar paginação como sincronização permanente.
- A consulta não exige tarifa ativa novamente: o preço já foi acordado na solicitação.
  O catálogo de categorias disponíveis exige tarifa ativa para novas solicitações.
- O bloqueio de ocupação dessa consulta é pelo papel de prestador. O PATCH Online também
  bloqueia corrida ativa como passageiro. Esta auditoria não alterou regras entre papéis.

Online não é prova de conexão de rede. Sem polling não há entrega espontânea: não existe
WebSocket/push nessa rota. A resposta é privada e não armazenável em cache.

## Diagnóstico de desenvolvimento

Habilitar conjuntamente, antes de iniciar a API:

    NODE_ENV=development
    VIAU_ENVIRONMENT=development
    VIAU_DIAGNOSTICO_OFERTAS=true

Produção/teste ou ausência de qualquer condição desabilita os eventos. Nenhuma consulta
adicional ao banco é executada para diagnóstico.

Prefixo: [ViaU:ofertas]. Eventos:

| Evento | Interpretação |
| --- | --- |
| PRESTADOR_INELEGIVEL | Não encontrado pelo filtro de conta ativa e prestador aprovado. |
| OFFLINE | Nenhum veículo selecionado no servidor. |
| VEICULO_DIVERGENTE | Parâmetro enviado difere do selecionado. |
| VEICULO_INELEGIVEL | Propriedade, aprovação, atividade ou categoria/tipo falhou. |
| CORRIDA_ATIVA | Já existe corrida ativa vinculada ao prestador. |
| CONSULTA_CONCLUIDA | Quantidade retornada, presença de cursor/veículo e próxima página. |
| HTTP_400/401/403/409/500 | Falha HTTP, sem corpo, token ou exceção bruta. |

Não há IDs, placas, nomes, contatos, coordenadas, valores, JWTs, refresh tokens ou SQL.
Um bloqueio no repositório pode gerar também o evento HTTP correspondente.
Os eventos são agregados por requisição, sem correlação de identidade: em desenvolvimento,
reproduza uma chamada de cada vez.

CONSULTA_CONCLUIDA com quantidade zero não identifica sozinho qual filtro eliminou uma
corrida. Não inventar a causa: comparar, no ambiente autorizado, categoria, estado,
atribuição, passageiro ativo, recusa e cursor da requisição. Logs não enumeram registros
privados nem consultam corridas fora do escopo autorizado.

## Teste manual, exclusivamente em desenvolvimento autorizado

1. Usar dois usuários de teste distintos no mesmo backend/banco: passageiro e prestador.
   O prestador e seu veículo devem já estar aprovados; categoria/tipo ativos e tarifa
   configurada. Não aprovar dados reais nem aplicar migrations para esta verificação.
2. Com JWT do prestador, consultar GET /api/prestadores/disponibilidade.
3. Sem corrida ativa, enviar PATCH /api/prestadores/disponibilidade com
   {"status":"ONLINE","veiculoId":"UUID_DO_VEICULO","versao":VERSAO_DO_GET}.
   Confirmar 200 e a seleção no GET.
4. Com JWT do passageiro, solicitar uma corrida pelo POST /api/corrida, usando exatamente
   a categoriaVeiculoId desse veículo e os campos existentes de origem/destino. O OSRM
   precisa estar configurado. Confirmar que a resposta tem status SOLICITADA.
5. Com JWT do prestador, consultar GET /api/corrida/disponiveis sem parâmetros.
   Esperado: 200 e o ID da corrida em corridas (percorrer proximoCursor se houver mais
   ofertas antigas). Diagnóstico: CONSULTA_CONCLUIDA com quantidade maior que zero.
6. A mesma consulta com veiculoId correto deve funcionar. Outro veículo deve retornar
   403. Não tratar 401/403/409 como lista vazia.
7. Recusar essa oferta pelo endpoint existente e repetir a consulta: não deve reaparecer
   para esse prestador. Um segundo prestador elegível da mesma categoria ainda pode vê-la.
8. Não finalizar o ensaio fazendo logout na expectativa de cancelar a corrida: o
   passageiro deve usar o cancelamento explícito existente para encerrar seu pedido.

Os testes automatizados desta auditoria não usam um PostgreSQL real. A suíte de integração
existente prepara schemas aplicando migrations, por isso não foi executada sob a restrição
atual. Permanece pendente a reprodução ponta a ponta com dados isolados autorizados.

## App

Nenhuma alteração no App foi feita e nenhum defeito nele foi confirmado. Verificar se
consulta a rota com JWT do prestador, atualiza o estado Online do servidor, usa categoria
exata, reinicia cursor ao atualizar ofertas e mostra erros HTTP. O backend não envia
ofertas espontaneamente. Se a chamada direta retorna a corrida e a tela não mostra,
a divergência passa a estar na integração/renderização e deve ser investigada separadamente.
