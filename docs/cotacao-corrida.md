# Cotação de corrida

`POST /api/corrida/cotacao` exige `Authorization: Bearer <access token>` de usuário ativo. Não exige cadastro de prestador nem ausência de corrida ativa: é uma consulta.

```json
{
  "categoriaVeiculoId": "00000000-0000-4000-8000-000000000002",
  "origemLatitude": -16.07,
  "origemLongitude": -57.67,
  "destinoLatitude": -16.08,
  "destinoLongitude": -57.69
}
```

Os nomes de campos são os mesmos da solicitação existente. `origemEndereco` e `destinoEndereco` são opcionais na cotação, mas continuam obrigatórios no POST /api/corrida. Preço, distância, identidade do usuário e campos desconhecidos não são aceitos no corpo da cotação.

Exemplo ilustrativo de resposta HTTP 200:

```json
{
  "categoriaVeiculoId": "00000000-0000-4000-8000-000000000002",
  "valorTotal": 12.01,
  "distanciaKm": 5.005,
  "duracaoSegundos": 600
}
```

O valor é a estimativa oficial calculada pelo backend em reais, com a tarifa vigente. Duração é a estimativa do percurso entre origem e destino retornada pelo OSRM, não o tempo de chegada do motorista. Sem duração no provedor, retorna null; não há fallback inventado nem cobrança por minuto.

Cotação e solicitação usam `CalcularCotacaoCorrida`: mesmas validações de categoria/tipo ativos e tarifa ativa, mesma rota OSRM e função monetária Decimal (`max(mínima, partida + km × valor/km)`). Duração não influencia o valor. O contrato de resposta da solicitação e a persistência da corrida permanecem iguais.

Cotação não grava corrida, reserva, sessão, preço ou qualquer outro dado no banco. Autenticação, categoria e tarifa são apenas lidas. Resposta usa Cache-Control private, no-store. O limitador OSRM existente mantém estado somente em memória e é compartilhado com solicitações; evite cotação a cada movimento do mapa ou chamadas imediatas repetidas.

Não há preço congelado, identificador de cotação ou validade garantida. O App deve cotar após selecionar os pontos/categoria e, ao confirmar, enviar os dados normais para POST /api/corrida, sem enviar preço/distância. Essa chamada recalcula: alteração de tarifa/rota entre as chamadas pode mudar o preço. A disponibilidade de motorista também não é garantida pela cotação.

Erros: 400 entrada inválida; 401 autenticação inválida/usuário inativo; 404 categoria/tipo ou tarifa indisponível; 422 rota/valor inválido; 429 limite OSRM; 502 resposta inválida do provedor; 503 indisponível/não configurado; 504 timeout; 500 erro interno.

Sem schema ou migration nova. Não foi acessado Neon nem executada migration. Testes usam doubles de tarifa/provedor e verificam equivalência de preços, mínimo, arredondamento, limite monetário, duração e autenticação; não representam uma consulta a um servidor OSRM externo.
