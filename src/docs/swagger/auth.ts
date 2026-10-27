/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Autenticação
 *     summary: Realizar login por e-mail ou telefone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senha
 *             oneOf:
 *               - required: [email]
 *               - required: [telefone]
 *             description: Informe exatamente um identificador. Telefone E.164 é consultado sem adicionar código de país; e-mail mantém normalização de espaços e caixa.
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: william@email.com
 *               telefone:
 *                 type: string
 *                 pattern: '^\+[1-9]\d{1,14}$'
 *                 example: '+5565990000001'
 *               senha:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 72
 *                 format: password
 *                 example: MinhaSenha123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso. JWT de 1 hora e refresh token de 7 dias. Resposta sem cache.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSessao'
 *       400:
 *         description: Dados inválidos.
 *       401:
 *         description: Credenciais inválidas.
 *       403:
 *         description: Usuário inativo.
 *       500:
 *         description: Erro interno do servidor.
 *
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Autenticação
 *     summary: Consultar usuário autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário autenticado.
 *       401:
 *         description: Token ausente ou inválido.
 *       500:
 *         description: Erro interno do servidor.
 */
