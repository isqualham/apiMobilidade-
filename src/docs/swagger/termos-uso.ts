/**
 * @swagger
 * /api/termos-uso:
 *   get:
 *     summary: Consultar termo de uso ativo
 *     tags:
 *       - Termos de Uso
 *     responses:
 *       200:
 *         description: Termo de uso ativo encontrado.
 *       404:
 *         description: Nenhum termo de uso ativo encontrado.
 *   post:
 *     summary: Cadastrar termo de uso
 *     tags:
 *       - Termos de Uso
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - versao
 *               - conteudo
 *             properties:
 *               versao:
 *                 type: string
 *                 example: "1.0"
 *               conteudo:
 *                 type: string
 *                 example: "Termos e condições de uso do ViaU."
 *               ativo:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Termo de uso cadastrado.
 *       400:
 *         description: Dados inválidos.
 *       401:
 *         description: Não autenticado.
 *       409:
 *         description: Já existe um termo ativo.
 */
