# Segurança da solicitação de corridas

## Estado da integração de rotas

O backend agora possui `OsrmRotasService`, selecionado pela configuração de
ambiente. Consulte [Integração OSRM](./integracao-osrm.md) para configurar uma
instância própria, um provedor autorizado ou uma demonstração controlada.
Sem `OSRM_BASE_URL`, retorna HTTP 503 e não grava corrida.

O pedido recebe origem, destino e categoria. `distanciaKm`, `valorTotal` e
`valorKmAplicado` enviados pelo cliente são rejeitados com 400. O adaptador
consulta o serviço Route v1 no servidor, valida a resposta e normaliza a distância
real retornada ao metro mais próximo. Não há fallback para estimativas do cliente.
A seleção do perfil viário e os limites do serviço dependem da configuração descrita
na documentação da integração.

## Onde a distância influencia dinheiro

- Antes desta tarefa, `SolicitarCorridaUseCase` multiplicava `dados.distanciaKm`
  por `tarifa.valorKm`, somava partida e aplicava o mínimo. A distância vinha do
  corpo da requisição. Agora usa exclusivamente o resultado de `RotasService`.
- `PrismaCorridaRepository.criar` persiste a distância e o total acordados.
- `finalizar` copia esse total para `valorFinalCobrado`: herdava o preço calculado
  sobre a distância do cliente.
- `encerrarAntecipadamente` divide o percurso GPS pela distância prevista salva
  e aplica a proporção ao total. Corridas antigas podem continuar contendo
  distância não verificada. Esta tarefa não saneia dados antigos nem altera a
  regra de cobrança antecipada ou a coleta GPS ainda ausente.

Na solicitação, o cálculo usa `Prisma.Decimal`, arredondamento `ROUND_HALF_UP`
e rejeição de resultado acima de `99999999.99`, inclusive antes de arredondar.
Strings decimais são mantidas até a escrita no PostgreSQL; a resposta pública
continua expondo números conforme o DTO existente.

## Uma corrida ativa por passageiro

`criar` verifica usuário e corridas ativas e insere dentro da mesma transação
PostgreSQL `Serializable`. Estados ativos: `SOLICITADA`, `ACEITA`,
`PRESTADOR_A_CAMINHO`, `EM_ANDAMENTO`.

Conflitos Prisma `P2034` repetem toda a transação, no máximo três tentativas.
Uma nova leitura identifica a corrida que venceu e retorna 409; esgotamento de
tentativas também retorna 409. Nenhum efeito externo ocorre dentro da transação.
O provedor de rotas é chamado antes dela.

O schema não foi alterado. A garantia depende de solicitações passarem por este
repositório; SQL externo ou outro caminho de criação precisará aplicar a mesma
regra. Duplicidades antigas não são removidas automaticamente.

## Testes

```sh
npm test
npx tsc --noEmit --incremental false
npm run lint
TEST_DATABASE_URL=postgresql://usuario:senha@localhost:5432/viau_test npm run test:integration
```

A integração exige PostgreSQL de testes e permissão para criar schemas. Nunca
usa `DATABASE_URL` do projeto e não carrega `.env`. Cria um schema aleatório,
aplica as migrations existentes nele e remove somente esse schema ao terminar.
Sem `TEST_DATABASE_URL`, falha explicitamente em vez de omitir testes.

O teste concorrente usa duas transações reais e uma barreira de leitura para
garantir que ambas observem inicialmente a ausência de corrida ativa. Verifica
uma criação, um 409, uma releitura após conflito e apenas uma linha persistida.
Os doubles de rotas existem somente nos testes; não são evidência de integração
com um provedor real.
