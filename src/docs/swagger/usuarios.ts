/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     tags:
 *       - Usuários
 *     summary: Cadastrar usuário
 *     description: Cria uma conta de usuário e registra o aceite dos Termos de Uso ativos.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - cpf
 *               - email
 *               - senha
 *               - aceitouTermos
 *             properties:
 *               nome:
 *                 type: string
 *                 example: William de Freitas
 *               cpf:
 *                 type: string
 *                 example: "12345678901"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: william@email.com
 *               telefone:
 *                 type: string
 *                 nullable: true
 *                 example: "65999999999"
 *               senha:
 *                 type: string
 *                 format: password
 *                 example: MinhaSenha123
 *               aceitouTermos:
 *                 type: boolean
 *                 enum: [true]
 *                 example: true
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso.
 *       400:
 *         description: Dados inválidos.
 *       409:
 *         description: CPF ou e-mail já cadastrado.
 *       503:
 *         description: Não há Termos de Uso ativos.
 *       500:
 *         description: Erro interno do servidor.
 */
