/**
 * @swagger
 * /api/categorias-veiculo/disponiveis:
 *   get:
 *     tags: [Categorias de Veículo]
 *     summary: Categorias com prestadores disponíveis para o usuário autenticado
 *     description: |
 *       Exige prestador aprovado, usuário ativo, Online com veículo próprio aprovado e ativo,
 *       categoria e tipo ativos, tarifa ativa e ausência de corrida ativa como prestador ou passageiro.
 *       Exclui o próprio usuário. Snapshot sem reserva, sem filtro de proximidade ou GPS.
 *       O catálogo geral /api/categorias-veiculo permanece disponível para cadastro de veículos.
 *       Cache-Control private, no-store.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Categorias elegíveis, ou lista vazia quando não houver oferta.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [categorias]
 *               properties:
 *                 categorias:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required: [id, tipoVeiculoId, nome, descricao, ordemExibicao]
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       tipoVeiculoId:
 *                         type: string
 *                         format: uuid
 *                       nome:
 *                         type: string
 *                       descricao:
 *                         type: string
 *                         nullable: true
 *                       ordemExibicao:
 *                         type: integer
 *       '401':
 *         description: Token ausente, inválido, expirado, sessão revogada ou usuário inativo.
 *       '500':
 *         description: Erro interno.
 */
