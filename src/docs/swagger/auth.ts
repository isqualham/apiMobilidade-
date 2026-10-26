/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Autenticação
 *     summary: Realizar login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: william@email.com
 *               senha:
 *                 type: string
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
