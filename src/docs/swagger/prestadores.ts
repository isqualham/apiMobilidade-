/**
 * @swagger
 * /api/prestadores:
 *   post:
 *     tags:
 *       - Prestadores
 *     summary: Solicitar cadastro de prestador
 *     description: Cria uma solicitação de cadastro de prestador para o usuário autenticado. O status inicial é PENDENTE. Não exige corpo da requisição.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Solicitação de cadastro realizada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - mensagem
 *                 - prestador
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Solicitação de cadastro de prestador realizada com sucesso.
 *                 prestador:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 550e8400-e29b-41d4-a716-446655440000
 *                     usuarioId:
 *                       type: string
 *                       format: uuid
 *                       example: 550e8400-e29b-41d4-a716-446655440001
 *                     statusAprovacao:
 *                       type: string
 *                       enum:
 *                         - PENDENTE
 *                         - APROVADO
 *                         - REJEITADO
 *                       example: PENDENTE
 *                     dataSolicitacao:
 *                       type: string
 *                       format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Token ausente, inválido ou expirado.
 *       409:
 *         description: O usuário já possui cadastro de prestador.
 *       500:
 *         description: Erro interno do servidor.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DecisaoAprovacaoPrestador:
 *       type: object
 *       additionalProperties: false
 *       required: [statusAprovacao]
 *       properties:
 *         statusAprovacao:
 *           type: string
 *           enum: [APROVADO, REJEITADO]
 *     ResultadoAprovacaoPrestador:
 *       type: object
 *       required: [mensagem, prestador]
 *       properties:
 *         mensagem:
 *           type: string
 *         prestador:
 *           type: object
 *           required: [id, usuarioId, statusAprovacao, updatedAt]
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             usuarioId:
 *               type: string
 *               format: uuid
 *             statusAprovacao:
 *               type: string
 *               enum: [APROVADO, REJEITADO]
 *             updatedAt:
 *               type: string
 *               format: date-time
 *     ErroAprovacaoPrestador:
 *       type: object
 *       required: [erro]
 *       properties:
 *         erro:
 *           type: string
 *   responses:
 *     FalhaAprovacaoPrestador:
 *       description: Falha ao avaliar o cadastro.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErroAprovacaoPrestador'
 * /api/prestadores/{id}/aprovacao:
 *   patch:
 *     tags: [Prestadores]
 *     summary: Aprovar ou rejeitar cadastro de prestador
 *     description: |
 *       Exclusivo para usuário ativo com administrador=true no banco, identificado pelo JWT.
 *       O id identifica Prestador, não Usuario. Aceita somente cadastros PENDENTES com usuário ativo.
 *       Transições permitidas são PENDENTE para APROVADO ou REJEITADO.
 *       Reenvio de decisão já aplicada, reavaliação e decisões concorrentes perdedoras retornam 409.
 *       Não permite suspensão, reabertura nem alteração do perfil de usuário.
 *       Campos extras, incluindo permissões e identidade do administrador, são rejeitados.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DecisaoAprovacaoPrestador'
 *           examples:
 *             aprovar:
 *               value: {statusAprovacao: APROVADO}
 *             rejeitar:
 *               value: {statusAprovacao: REJEITADO}
 *     responses:
 *       200:
 *         description: Cadastro avaliado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResultadoAprovacaoPrestador'
 *       400:
 *         description: UUID, JSON, status inválido ou campos extras.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroAprovacaoPrestador'
 *       401:
 *         description: Token ausente, inválido ou expirado; usuário inexistente ou inativo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroAprovacaoPrestador'
 *       403:
 *         description: Usuário sem permissão administrativa atual.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroAprovacaoPrestador'
 *       404:
 *         description: Prestador não encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroAprovacaoPrestador'
 *       409:
 *         description: Cadastro já avaliado, usuário do prestador inativo ou conflito concorrente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroAprovacaoPrestador'
 *       500:
 *         $ref: '#/components/responses/FalhaAprovacaoPrestador'
 */
