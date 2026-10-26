/**
 * @swagger
 * /api/tarifas:
 *   get:
 *     tags:
 *       - Tarifas
 *     summary: Consultar tarifas ativas
 *     description: Retorna as tarifas ativas das categorias de veículo ativas. Os valores são apresentados em reais (BRL). Não exige autenticação.
 *     responses:
 *       200:
 *         description: Tarifas consultadas com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tarifas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       categoriaVeiculoId:
 *                         type: string
 *                         format: uuid
 *                       valorKm:
 *                         type: number
 *                         format: double
 *                         example: 2.50
 *                       tarifaMinima:
 *                         type: number
 *                         format: double
 *                         example: 8.00
 *                       taxaPartida:
 *                         type: number
 *                         format: double
 *                         example: 3.00
 *                       ativo:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       500:
 *         description: Erro interno do servidor.
 *
 *   post:
 *     tags:
 *       - Tarifas
 *     summary: Cadastrar tarifa de categoria
 *     description: Cadastra uma tarifa para uma categoria de veículo ativa. Cada categoria pode possuir uma única tarifa cadastrada. Operação exclusiva para administradores autenticados.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoriaVeiculoId
 *               - valorKm
 *               - tarifaMinima
 *             properties:
 *               categoriaVeiculoId:
 *                 type: string
 *                 format: uuid
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               valorKm:
 *                 type: number
 *                 format: double
 *                 minimum: 0.01
 *                 multipleOf: 0.01
 *                 example: 2.50
 *               tarifaMinima:
 *                 type: number
 *                 format: double
 *                 minimum: 0.01
 *                 multipleOf: 0.01
 *                 example: 8.00
 *               taxaPartida:
 *                 type: number
 *                 format: double
 *                 minimum: 0
 *                 multipleOf: 0.01
 *                 default: 0
 *                 example: 3.00
 *               ativo:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: Tarifa cadastrada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Tarifa cadastrada com sucesso.
 *                 tarifa:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     categoriaVeiculoId:
 *                       type: string
 *                       format: uuid
 *                     valorKm:
 *                       type: number
 *                       example: 2.50
 *                     tarifaMinima:
 *                       type: number
 *                       example: 8.00
 *                     taxaPartida:
 *                       type: number
 *                       example: 3.00
 *                     ativo:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Valores inválidos ou categoria inexistente ou inativa.
 *       401:
 *         description: Token ausente, inválido ou expirado.
 *       403:
 *         description: Usuário sem permissão de administrador.
 *       409:
 *         description: Já existe uma tarifa cadastrada para essa categoria.
 *       500:
 *         description: Erro interno do servidor.
 */
