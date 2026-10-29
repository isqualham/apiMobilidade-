/**
 * @swagger
 * /api/categorias-veiculo:
 *   get:
 *     tags:
 *       - Categorias de Veículo
 *     summary: Listar categorias de veículo ativas
 *     description: Retorna as categorias ativas vinculadas a tipos de veículo ativos. Não exige autenticação.
 *     responses:
 *       200:
 *         description: Categorias listadas com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categorias:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       tipoVeiculoId:
 *                         type: string
 *                         format: uuid
 *                       nome:
 *                         type: string
 *                         example: Carro Econômico
 *                       descricao:
 *                         type: string
 *                         nullable: true
 *                         example: Categoria de transporte econômico.
 *                       ativo:
 *                         type: boolean
 *                         example: true
 *                       ordemExibicao:
 *                         type: integer
 *                         example: 1
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
 *       - Categorias de Veículo
 *     summary: Cadastrar categoria de veículo
 *     description: Cadastra uma categoria vinculada a um tipo de veículo ativo. Operação exclusiva para administradores autenticados.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tipoVeiculoId
 *               - nome
 *             properties:
 *               tipoVeiculoId:
 *                 type: string
 *                 format: uuid
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               nome:
 *                 type: string
 *                 maxLength: 100
 *                 example: Carro Premium
 *               descricao:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 255
 *                 example: Categoria com veículos mais confortáveis.
 *               ativo:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *               ordemExibicao:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 example: 2
 *     responses:
 *       201:
 *         description: Categoria cadastrada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Categoria cadastrada com sucesso.
 *                 categoria:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     tipoVeiculoId:
 *                       type: string
 *                       format: uuid
 *                     nome:
 *                       type: string
 *                       example: Carro Premium
 *                     descricao:
 *                       type: string
 *                       nullable: true
 *                     ativo:
 *                       type: boolean
 *                     ordemExibicao:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Dados inválidos ou tipo de veículo inexistente ou inativo.
 *       401:
 *         description: Token ausente, inválido ou expirado.
 *       403:
 *         description: Usuário sem permissão de administrador.
 *       409:
 *         description: Já existe uma categoria com esse nome.
 *       500:
 *         description: Erro interno do servidor.
 */
