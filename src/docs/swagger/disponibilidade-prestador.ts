/**
 * @swagger
 * components:
 *   schemas:
 *     DisponibilidadePrestador:
 *       type: object
 *       required: [status, veiculoId, versao]
 *       properties:
 *         status:
 *           type: string
 *           enum: [ONLINE, OFFLINE]
 *         veiculoId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         versao:
 *           type: integer
 *           minimum: 0
 *     AlterarDisponibilidade:
 *       oneOf:
 *         - type: object
 *           additionalProperties: false
 *           required: [status, veiculoId, versao]
 *           properties:
 *             status:
 *               type: string
 *               enum: [ONLINE]
 *             veiculoId:
 *               type: string
 *               format: uuid
 *             versao:
 *               type: integer
 *               minimum: 0
 *               maximum: 2147483646
 *         - type: object
 *           additionalProperties: false
 *           required: [status, versao]
 *           properties:
 *             status:
 *               type: string
 *               enum: [OFFLINE]
 *             versao:
 *               type: integer
 *               minimum: 0
 *               maximum: 2147483646
 * /api/prestadores/disponibilidade:
 *   get:
 *     tags: [Prestadores]
 *     summary: Consultar disponibilidade declarada do prestador autenticado
 *     description: Estado compartilhado entre sessões. Logout confirmado coloca a conta Offline sem cancelar corridas; expiração e desconexão não alteram o estado. Não indica presença de rede ou elegibilidade atual. Aprovação e atividade são revalidadas nas operações. Resposta sem cache.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Disponibilidade atual. OFFLINE tem veiculoId null.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DisponibilidadePrestador'
 *       401:
 *         description: Autenticação inválida, expirada, sessão revogada ou usuário inativo.
 *       403:
 *         description: Usuário sem cadastro de prestador.
 *       500:
 *         description: Falha interna.
 *   patch:
 *     tags: [Prestadores]
 *     summary: Alterar disponibilidade ou veículo selecionado
 *     description: Exige a versao retornada pelo GET. ONLINE exige aprovação e veículo próprio APROVADO e ativo com categoria e tipo ativos. OFFLINE remove a seleção. Corrida ativa como prestador ou passageiro bloqueia qualquer PATCH, inclusive repetição. Sem corrida, repetir o estado com versão atual não incrementa a versão. Sessões concorrentes devem consultar novamente após 409. Não altera corridas, login ou sessões.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlterarDisponibilidade'
 *           examples:
 *             online:
 *               value: {status: ONLINE, veiculoId: 'b12a0000-0000-4000-8000-000000000021', versao: 0}
 *             offline:
 *               value: {status: OFFLINE, versao: 1}
 *     responses:
 *       200:
 *         description: Disponibilidade salva. Resposta sem cache.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DisponibilidadePrestador'
 *       400:
 *         description: JSON, campos ou versão inválidos. Campos extras são rejeitados.
 *       401:
 *         description: Autenticação inválida, expirada, sessão revogada ou usuário inativo.
 *       403:
 *         description: Sem prestador, não aprovado para Online ou veículo inelegível.
 *       409:
 *         description: Versão desatualizada, corrida ativa ou conflito concorrente. Consultar novamente antes de tentar.
 *       500:
 *         description: Falha interna.
 */
export {};
