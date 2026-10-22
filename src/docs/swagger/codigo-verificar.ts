/**
 * @openapi
 * /api/auth/codigo/verificar:
 *   post:
 *     tags:
 *       - Autenticação
 *     summary: Verificar telefone por código SMS
 *     description: >
 *       Valida o código de quatro dígitos enviado pelo Twilio Verify
 *       para o telefone cadastrado do usuário autenticado.
 *       Após a aprovação, o telefone é marcado como verificado.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *             properties:
 *               codigo:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "123466"
 *                 description: Código de quatro dígitos recebido por SMS.
 *     responses:
 *       "200":
 *         description: Telefone verificado ou já verificado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verificado:
 *                   type: boolean
 *                   example: true
 *                 mensagem:
 *                   type: string
 *                   example: Telefone verificado com sucesso.
 *       "400":
 *         description: Código inválido, expirado ou telefone não cadastrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                   example: O código deve conter exatamente 4 dígitos.
 *                 verificado:
 *                   type: boolean
 *                   example: false
 *                 mensagem:
 *                   type: string
 *                   example: Código inválido ou expirado.
 *       "401":
 *         description: Token ausente, inválido ou expirado.
 *       "403":
 *         description: Usuário inativo.
 *       "500":
 *         description: Erro interno ou serviço de verificação não configurado.
 */
