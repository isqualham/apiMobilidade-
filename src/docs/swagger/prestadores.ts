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
