# Consultas de corridas — integração Expo

Todas as rotas exigem `Authorization: Bearer <JWT>`. O token é validado e o usuário
ativo é carregado do banco. Parâmetros de identidade como `usuarioId`, `passageiroId`
e `prestadorId` são rejeitados, assim como parâmetros desconhecidos ou repetidos.

## Endpoints

| Método e caminho | Resultado |
| --- | --- |
| GET /api/corrida/disponiveis?veiculoId=UUID | Ofertas para o veículo próprio selecionado. |
| GET /api/corrida/ativa?papel=todos | Corrida ativa do usuário, ou `corrida: null`. |
| GET /api/corrida/{id} | Detalhes somente para participantes. |
| GET /api/corrida | Histórico próprio, apenas estados encerrados. |

As rotas estáticas `ativa` e `disponiveis` têm precedência sobre `[id]` no App
Router. `GET /api/corrida` convive com o POST existente. O resolvedor de rotas da
versão instalada do Next.js foi conferido; não há conflito com os endpoints de escrita.

## Autorização e minimização de dados

- Detalhes e ativa: passageiro ou prestador vinculado à corrida. Ser administrador
  não permite consultar corridas de terceiros. Inexistente e não participante
  recebem o mesmo 404 em detalhes, evitando revelar a existência da corrida.
- Histórico: somente corridas em que o usuário participou. Não expõe coordenadas,
  endereços, identidade de outros usuários ou dados do veículo.
- Ofertas: prestador APROVADO, usuário ativo, sem corrida atribuída ativa; veículo
  informado deve ser próprio, ativo, com categoria e tipo ativos. Falta de
  elegibilidade retorna 403; motorista ocupado retorna 409.
- Ofertas incluem somente SOLICITADA, sem prestador, da categoria do veículo,
  de outro passageiro ativo. Não incluem identidade, contato, endereço textual,
  placa ou coordenadas exatas. Coordenadas são arredondadas a duas casas decimais,
  representando regiões aproximadas — não garantia de anonimato geográfico.
- A aprovação atual não é exigida para consultar a própria corrida/histórico:
  perder a elegibilidade para novas ofertas não apaga o vínculo com corridas anteriores.
- Nenhuma consulta retorna CPF, email, telefone, senha ou registros GPS.
- As respostas, inclusive erros, incluem `Cache-Control: private, no-store` e
  `Vary: Authorization`. Nenhuma consulta usa cache compartilhado do Next.js.

## Status e dois papéis

Ativas: SOLICITADA, ACEITA, PRESTADOR_A_CAMINHO, EM_ANDAMENTO.
Histórico: FINALIZADA, CANCELADA, ENCERRADA_ANTECIPADAMENTE.

Ativa e histórico aceitam `papel=todos|passageiro|prestador` (padrão `todos`).
Esse parâmetro filtra o vínculo do usuário autenticado, nunca autoriza outra pessoa.
Se houver mais de uma corrida ativa em `todos`, retorna 409: selecione o papel.
Se ainda houver múltiplas no papel selecionado, requer suporte para inconsistência
preexistente. Nenhuma corrida é silenciosamente escondida por escolher só a primeira.

## Filtros, paginação e ordenação

Ofertas e histórico aceitam `limite` (1–50, padrão 20) e `cursor` opaco.
Histórico aceita também `status`, restrito aos três estados encerrados.
Ofertas exigem `veiculoId`; detalhes não aceitam filtros.

A resposta paginada é `{corridas: [], proximoCursor: null}`. Reutilize o cursor
retornado com os mesmos filtros/veículo. Não existe número de página, total ou
contagem extra. Ofertas ordenam por `createdAt ASC, id ASC`; histórico por
`createdAt DESC, id DESC`. O UUID desempata datas iguais. A consulta usa comparação
com a última data/ID e busca no máximo `limite + 1`, sem OFFSET crescente.

A listagem de ofertas lê elegibilidade e corridas sob um snapshot RepeatableRead.
Isso não reserva a corrida. Outra pessoa pode aceitá-la entre GET e POST; o POST
continua sendo a autoridade, com seus controles transacionais de concorrência.
Entre páginas, alterações de status podem remover itens; não há snapshot persistido
para toda a navegação. Os índices existentes são reutilizados; não houve migração.

## Exemplos ilustrativos de JSON

Ofertas (o `id` é usado posteriormente no POST de aceite):

```json
{
  "corridas": [{
    "id": "00000000-0000-4000-8000-000000000001",
    "status": "SOLICITADA",
    "categoriaVeiculoId": "00000000-0000-4000-8000-000000000002",
    "distanciaKm": 3.5,
    "valorTotal": 11.75,
    "createdAt": "2026-10-25T12:00:00.000Z",
    "origemAproximada": {"latitude": -16.07, "longitude": -57.68},
    "destinoAproximado": {"latitude": -16.09, "longitude": -57.69}
  }],
  "proximoCursor": null
}
```

Sem corrida ativa:

```json
{"corrida": null}
```

Detalhes, ou ativa quando encontrada (endereços abaixo são fictícios):

```json
{
  "corrida": {
    "id": "00000000-0000-4000-8000-000000000001",
    "status": "SOLICITADA",
    "categoriaVeiculoId": "00000000-0000-4000-8000-000000000002",
    "distanciaKm": 3.5,
    "valorTotal": 11.75,
    "valorFinalCobrado": null,
    "createdAt": "2026-10-25T12:00:00.000Z",
    "papel": "passageiro",
    "origem": {"endereco": "Ponto A", "latitude": -16.0705, "longitude": -57.6789},
    "destino": {"endereco": "Ponto B", "latitude": -16.085, "longitude": -57.69},
    "valorKmAplicado": 2.5,
    "distanciaPercorridaKm": null,
    "dataAceite": null,
    "dataInicio": null,
    "dataFinalizacao": null,
    "dataCancelamento": null,
    "veiculo": null
  }
}
```

Histórico:

```json
{
  "corridas": [{
    "id": "00000000-0000-4000-8000-000000000001",
    "status": "FINALIZADA",
    "categoriaVeiculoId": "00000000-0000-4000-8000-000000000002",
    "distanciaKm": 3.5,
    "valorTotal": 11.75,
    "valorFinalCobrado": 11.75,
    "createdAt": "2026-10-25T12:00:00.000Z"
  }],
  "proximoCursor": null
}
```

## Erros e limites para o Expo

400: parâmetro inválido/desconhecido/repetido, cursor ou UUID inválido.
401: autenticação inválida ou usuário inativo. 403: inelegível para ofertas.
404: detalhes inexistentes ou não autorizados. 409: prestador ocupado ou múltiplas
ativas. 500: erro inesperado. Corpo de erro: `{ "mensagem": "..." }`.

O aplicativo deve obter os veículos do prestador, escolher `veiculoId` e consultar
as ofertas. Após aceitar, consultar os detalhes para obter endereços e coordenadas
exatas. Para recuperar uma sessão, consultar `ativa`. Uma lista vazia é 200.

Não há busca por proximidade, presença online, rastreamento GPS, WebSocket,
notificações nem mudanças no Expo nesta tarefa. Atualização de estado depende de
novas consultas HTTP; evite polling agressivo. Lista de ofertas não fornece nomes,
contatos, motivos de cancelamento nem dados completos de perfil. Os detalhes
incluem somente placa, marca, modelo e cor do veículo atribuído, quando existente.

## Arquitetura e testes

A leitura usa DTO → CorridaConsultaRepository → PrismaCorridaConsultaRepository →
ConsultarCorridasUseCase → API Route. A interface de escrita existente foi preservada.
Os selects Prisma são explícitos; a autorização faz parte do filtro SQL de detalhes,
ativas e histórico. Não há consulta por ID seguida de autorização somente em memória.

`npm test` valida parâmetros, autenticação e contratos. `npm run test:integration`
com `TEST_DATABASE_URL` usa schemas aleatórios em PostgreSQL isolado, cobrindo
terceiros, papéis, ofertas, histórico, paginação e regressões anteriores. A suíte
OpenAPI valida o documento inteiro. Nenhum dado real é alterado.

Durante a regressão, a suíte existente revelou conflito no COMMIT exposto como
`DriverAdapterError` pelo adapter-pg. O tratamento da solicitação foi ampliado
para reconhecer `TransactionWriteConflict` com SQLSTATE 40001/40P01, além de P2034,
reutilizando o limite de três tentativas e o retorno 409 existentes. Falhas de
conexão não são repetidas como se fossem conflitos de serialização.
