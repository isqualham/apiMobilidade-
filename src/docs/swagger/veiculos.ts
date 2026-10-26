/**
 * @swagger
 * /api/veiculos:
 *   get:
 *     tags:
 *       - Veículos
 *     summary: Listar veículos do prestador autenticado
 *     description: Retorna os veículos vinculados ao prestador autenticado e aprovado. Não permite consultar veículos de outros prestadores.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Veículos listados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 veiculos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       prestadorId:
 *                         type: string
 *                         format: uuid
 *                       categoriaVeiculoId:
 *                         type: string
 *                         format: uuid
 *                       placa:
 *                         type: string
 *                         example: ABC1D23
 *                       marca:
 *                         type: string
 *                         example: Toyota
 *                       modelo:
 *                         type: string
 *                         example: Corolla
 *                       ano:
 *                         type: integer
 *                         example: 2024
 *                       cor:
 *                         type: string
 *                         nullable: true
 *                         example: Prata
 *                       imagemUrl:
 *                         type: string
 *                         format: uri
 *                         nullable: true
 *                         example: https://exemplo.com/veiculos/corolla.jpg
 *                       ativo:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Token ausente, inválido ou expirado.
 *       403:
 *         description: Usuário sem cadastro de prestador aprovado.
 *       500:
 *         description: Erro interno do servidor.
 *
 *   post:
 *     tags:
 *       - Veículos
 *     summary: Cadastrar veículo do prestador
 *     description: Cadastra um veículo vinculado automaticamente ao prestador autenticado e aprovado. A categoria precisa estar ativa e pertencer a um tipo de veículo ativo. A imagem é informada por URL, sem upload de arquivo.
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
 *               - placa
 *               - marca
 *               - modelo
 *               - ano
 *             properties:
 *               categoriaVeiculoId:
 *                 type: string
 *                 format: uuid
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               placa:
 *                 type: string
 *                 description: Placa brasileira antiga ou Mercosul.
 *                 example: ABC1D23
 *               marca:
 *                 type: string
 *                 example: Toyota
 *               modelo:
 *                 type: string
 *                 example: Corolla
 *               ano:
 *                 type: integer
 *                 example: 2024
 *               cor:
 *                 type: string
 *                 nullable: true
 *                 example: Prata
 *               imagemUrl:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 maxLength: 500
 *                 example: https://exemplo.com/veiculos/corolla.jpg
 *               ativo:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: Veículo cadastrado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Veículo cadastrado com sucesso.
 *                 veiculo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     prestadorId:
 *                       type: string
 *                       format: uuid
 *                     categoriaVeiculoId:
 *                       type: string
 *                       format: uuid
 *                     placa:
 *                       type: string
 *                       example: ABC1D23
 *                     marca:
 *                       type: string
 *                       example: Toyota
 *                     modelo:
 *                       type: string
 *                       example: Corolla
 *                     ano:
 *                       type: integer
 *                       example: 2024
 *                     cor:
 *                       type: string
 *                       nullable: true
 *                     imagemUrl:
 *                       type: string
 *                       format: uri
 *                       nullable: true
 *                     ativo:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Dados inválidos ou categoria de veículo inexistente ou inativa.
 *       401:
 *         description: Token ausente, inválido ou expirado.
 *       403:
 *         description: Usuário sem cadastro de prestador aprovado.
 *       409:
 *         description: Já existe um veículo cadastrado com essa placa.
 *       500:
 *         description: Erro interno do servidor.
 */
