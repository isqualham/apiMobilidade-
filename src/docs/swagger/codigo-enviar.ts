/**
 * @openapi
 * /api/auth/codigo/enviar:
 *   post:
 *     tags:
 *       - Autenticação
 *     summary: Enviar código de verificação por SMS
 *     description: >
 *       Envia um código pelo Twilio Verify ao telefone cadastrado
 *       do usuário autenticado. O telefone não é recebido no corpo
 *       da requisição.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Solicitação realizada ou telefone já verificado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enviado:
 *                   type: boolean
 *                   example: true
 *                 verificado:
 *                   type: boolean
 *                   example: false
 *                 mensagem:
 *                   type: string
 *                   example: Solicitação de envio realizada.
 *                 status:
 *                   type: string
 *                   example: pending
 *       "400":
 *         description: Telefone ausente ou inválido.
 *       "401":
 *         description: Token ausente, inválido ou expirado.
 *       "403":
 *         description: Usuário inativo ou não encontrado.
 *       "500":
 *         description: Serviço SMS não configurado ou falha no envio.
 */
