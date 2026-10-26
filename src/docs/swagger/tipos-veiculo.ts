/**
 * @swagger
 * /api/tipos-veiculo:
 *   get:
 *     tags:
 *       - Tipos de Veículo
 *     summary: Listar tipos de veículo ativos
 *     description: Retorna os tipos de veículo ativos cadastrados no ViaU, como Carro e Moto. Não exige autenticação.
 *     responses:
 *       200:
 *         description: Tipos de veículo listados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tipos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       nome:
 *                         type: string
 *                         example: Carro
 *                       descricao:
 *                         type: string
 *                         nullable: true
 *                         example: Transporte de passageiros em automóvel.
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
 *       - Tipos de Veículo
 *     summary: Cadastrar tipo de veículo
 *     description: Cadastra um novo tipo de veículo. Operação exclusiva para administradores autenticados.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *             properties:
 *               nome:
 *                 type: string
 *                 maxLength: 80
 *                 example: Moto
 *               descricao:
 *                 type: string
 *                 nullable: true
 *                 maxLength: 255
 *                 example: Transporte por motocicleta.
 *               ativo:
 *                 type: boolean
 *                 default: true
 *                 example: true
 *     responses:
 *       201:
 *         description: Tipo de veículo cadastrado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Tipo de veículo cadastrado com sucesso.
 *                 tipo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     nome:
 *                       type: string
 *                       example: Moto
 *                     descricao:
 *                       type: string
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
 *         description: Dados inválidos ou JSON malformado.
 *       401:
 *         description: Token ausente, inválido ou expirado.
 *       403:
 *         description: Usuário sem permissão de administrador.
 *       409:
 *         description: Já existe um tipo de veículo com esse nome.
 *       500:
 *         description: Erro interno do servidor.
 */
