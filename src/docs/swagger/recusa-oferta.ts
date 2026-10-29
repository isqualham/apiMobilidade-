/**
 * @swagger
 * /api/corrida/{id}/recusar:
 *   post:
 *     tags: [Corridas]
 *     summary: Recusar oferta somente para o prestador autenticado
 *     description: Exige usuário ativo e prestador aprovado. Para primeira recusa exige Online com veículo próprio aprovado e ativo, categoria/tipo ativos, categoria compatível e ausência de corrida ativa como prestador. Corrida deve estar SOLICITADA, sem prestador e não pertencer ao próprio usuário. Não altera nem cancela corrida. Recusa persiste por prestador, mesmo trocando de veículo, e impede aceite posterior por ele. Repetição de recusa própria retorna o registro original mesmo Offline ou após a corrida mudar de status; autenticação e aprovação do prestador continuam obrigatórias. Nenhum endpoint desfaz recusa. Outros prestadores permanecem elegíveis.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string, format: uuid}
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema: {type: object, additionalProperties: false}
 *           example: {}
 *     responses:
 *       200:
 *         description: Recusa registrada ou já existente. Resposta privada sem cache.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [corridaId, recusada, recusadaEm]
 *               properties:
 *                 corridaId: {type: string, format: uuid}
 *                 recusada: {type: boolean, enum: [true]}
 *                 recusadaEm: {type: string, format: date-time}
 *       400:
 *         description: ID inválido, JSON inválido ou campos no corpo.
 *       401:
 *         description: Autenticação inválida, expirada ou usuário inativo.
 *       403:
 *         description: Prestador não aprovado, Offline ou veículo inelegível.
 *       404:
 *         description: Oferta inexistente, categoria incompatível, passageiro inativo ou corrida do próprio usuário.
 *       409:
 *         description: Oferta não está SOLICITADA/livre, prestador ocupado ou conflito concorrente.
 *       500:
 *         description: Falha interna.
 */
export {};
