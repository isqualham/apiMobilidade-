# Recusa individual de ofertas

`POST /api/corrida/{id}/recusar`, com Bearer JWT. Não envia corpo ou envia `{}`. Identidade e veículo selecionado vêm do banco. Campos adicionais são rejeitados.

Resposta HTTP 200:

```json
{"corridaId":"00000000-0000-4000-8000-000000000001","recusada":true,"recusadaEm":"2026-10-28T12:00:00.000Z"}
```

A primeira recusa exige prestador ativo/aprovado, Online com veículo próprio aprovado/ativo, categoria/tipo ativos, compatibilidade com a oferta e nenhuma corrida ativa como prestador. A corrida precisa estar SOLICITADA e sem prestador. Corrida do próprio passageiro não é uma oferta elegível.

A API grava somente a relação prestador/corrida e data. Não muda status, preço, passageiro, seleção Online, nem cria cancelamento. O filtro é aplicado no banco antes da paginação de ofertas; outros prestadores continuam vendo a corrida. Trocar veículo ou sessão não elimina a recusa. Aceitar diretamente pelo ID depois de recusar retorna 409. Não há operação para desfazer recusa.

Repetir recusa já existente retorna o mesmo horário, sem duplicação, mesmo se o prestador ficou Offline ou a corrida foi aceita/cancelada depois. A autenticação, usuário ativo e aprovação do prestador continuam obrigatórios. A resposta não revela a situação atual da corrida.

Chave primária composta previne duplicidade. Transações Serializable, retentativas limitadas e consulta de recusa no aceite impedem confirmar aceite e recusa simultâneos pelo mesmo prestador. Uma recusa seguida de aceite por OUTRO prestador é permitida. Disputas persistentes retornam 409.

No App, remover a oferta localmente após 200, sem chamar cancelamento. Em perda de resposta pode repetir a chamada. Em 409, atualizar a lista. Recusar todas as ofertas não muda o status Online e não cancela a solicitação do passageiro.

Migration: `prisma/migrations/20261028010000_recusa_oferta/migration.sql`. Cria apenas a tabela de recusas e vínculos/índice. Não executada; aplicação manual é necessária antes de disponibilizar este código. Nenhum acesso ao Neon ou alteração do Git foi realizado.

Testes PostgreSQL estão preparados, mas sua execução foi omitida porque a preparação aplica migrations. Testes unitários, autorização e OpenAPI não necessitam banco.
