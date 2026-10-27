/**
 * @swagger
 * tags:
 *   - name: Corridas
 *     description: Solicitação, aceite, início, finalização e cancelamento de corridas do ViaU.
 *
 * components:
 *   schemas:
 *     Corrida:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         passageiroId:
 *           type: string
 *           format: uuid
 *         prestadorId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         veiculoId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         categoriaVeiculoId:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum:
 *             - SOLICITADA
 *             - ACEITA
 *             - PRESTADOR_A_CAMINHO
 *             - EM_ANDAMENTO
 *             - FINALIZADA
 *             - CANCELADA
 *             - ENCERRADA_ANTECIPADAMENTE
 *         distanciaKm:
 *           type: number
 *           format: double
 *           example: 8.5
 *         valorKmAplicado:
 *           type: number
 *           format: double
 *           example: 2.5
 *         valorTotal:
 *           type: number
 *           format: double
 *           example: 24.25
 *         distanciaPercorridaKm:
 *           type: number
 *           nullable: true
 *           example: 3.2
 *         valorFinalCobrado:
 *           type: number
 *           nullable: true
 *           example: 9.13
 *         dataAceite:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         dataInicio:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         dataFinalizacao:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         dataCancelamento:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 *     SolicitarCorrida:
 *       type: object
 *       required:
 *         - categoriaVeiculoId
 *         - origemEndereco
 *         - origemLatitude
 *         - origemLongitude
 *         - destinoEndereco
 *         - destinoLatitude
 *         - destinoLongitude
 *       properties:
 *         categoriaVeiculoId:
 *           type: string
 *           format: uuid
 *         origemEndereco:
 *           type: string
 *           maxLength: 500
 *           example: "Centro, Cáceres - MT"
 *         origemLatitude:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *           example: -16.0705
 *         origemLongitude:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *           example: -57.6789
 *         destinoEndereco:
 *           type: string
 *           maxLength: 500
 *           example: "Bairro Cavalhada, Cáceres - MT"
 *         destinoLatitude:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *           example: -16.085
 *         destinoLongitude:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *           example: -57.69
 *
 *     AceitarCorrida:
 *       type: object
 *       required:
 *         - veiculoId
 *       properties:
 *         veiculoId:
 *           type: string
 *           format: uuid
 *
 *     MotivoEncerramentoCorrida:
 *       type: object
 *       required:
 *         - motivo
 *       properties:
 *         motivo:
 *           type: string
 *           maxLength: 150
 *           example: "Desistência do passageiro"
 *         descricao:
 *           type: string
 *           maxLength: 500
 *           example: "O passageiro solicitou o encerramento."
 *
 *     RespostaCorrida:
 *       type: object
 *       properties:
 *         mensagem:
 *           type: string
 *         corrida:
 *           $ref: '#/components/schemas/Corrida'
 *
 *     ErroCorrida:
 *       type: object
 *       properties:
 *         mensagem:
 *           type: string
 *           example: "Não é possível realizar esta operação."
 */

/**
 * @swagger
 * /api/corrida:
 *   post:
 *     tags: [Corridas]
 *     summary: Solicitar uma corrida
 *     description: |
 *       Cria uma solicitação de corrida para o passageiro autenticado.
 *       O passageiroId é obtido do JWT.
 *       O valor é calculado a partir da tarifa ativa da categoria.
 *       Distância e preço enviados pelo cliente são rejeitados com 400.
 *       A distância é calculada pelo OSRM configurado no servidor e normalizada ao metro mais próximo.
 *       Sem provedor configurado, retorna 503 e não cria uma corrida.
 *       Um passageiro pode ter apenas uma corrida ativa, incluindo SOLICITADA.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SolicitarCorrida'
 *     responses:
 *       201:
 *         description: Corrida solicitada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespostaCorrida'
 *       400:
 *         description: Dados inválidos.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Acesso negado.
 *       404:
 *         description: Passageiro, categoria ou tarifa não encontrada.
 *       409:
 *         description: Passageiro já possui corrida ativa ou conflito de serialização.
 *       422:
 *         description: Rota inexistente, distância insuficiente, tarifa inválida ou valor acima do limite Decimal(10,2).
 *       429:
 *         description: Limite local de consultas de rotas atingido.
 *       502:
 *         description: Resposta inválida ou falha HTTP do provedor de rotas.
 *       503:
 *         description: Serviço de rotas não configurado, configuração não autorizada, falha de rede ou limite do provedor.
 *       504:
 *         description: Tempo limite ao consultar o provedor de rotas.
 *       500:
 *         description: Erro interno do servidor.
 */

/**
 * @swagger
 * /api/corrida/{id}/aceitar:
 *   post:
 *     tags: [Corridas]
 *     summary: Aceitar uma corrida
 *     description: Exige prestador aprovado, ONLINE com o mesmo veiculoId enviado, livre e veículo próprio ativo e compatível. Offline ou veículo diferente retorna 403; conflito concorrente com mudança de disponibilidade retorna 409.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da corrida.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AceitarCorrida'
 *     responses:
 *       200:
 *         description: Corrida aceita com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespostaCorrida'
 *       400:
 *         description: Dados inválidos.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Prestador sem permissão.
 *       404:
 *         description: Corrida não encontrada.
 *       409:
 *         description: Corrida indisponível ou conflito de aceite.
 *       500:
 *         description: Erro interno do servidor.
 */

/**
 * @swagger
 * /api/corrida/{id}/iniciar:
 *   post:
 *     tags: [Corridas]
 *     summary: Iniciar uma corrida
 *     description: Inicia uma corrida aceita pelo prestador responsável.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Corrida iniciada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespostaCorrida'
 *       400:
 *         description: ID da corrida inválido.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Acesso negado.
 *       409:
 *         description: Corrida não pode ser iniciada.
 *       500:
 *         description: Erro interno do servidor.
 */

/**
 * @swagger
 * /api/corrida/{id}/finalizar:
 *   post:
 *     tags: [Corridas]
 *     summary: Finalizar uma corrida
 *     description: Finaliza uma corrida em andamento e registra o valor total previamente calculado.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Corrida finalizada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespostaCorrida'
 *       400:
 *         description: ID da corrida inválido.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Acesso negado.
 *       409:
 *         description: Corrida não está em andamento.
 *       500:
 *         description: Erro interno do servidor.
 */

/**
 * @swagger
 * /api/corrida/{id}/cancelar:
 *   post:
 *     tags: [Corridas]
 *     summary: Cancelar uma corrida antes do início
 *     description: |
 *       Permite que o passageiro ou prestador responsável cancele
 *       uma corrida ainda não iniciada, sem cobrança.
 *       Registra o motivo e o responsável pelo cancelamento.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MotivoEncerramentoCorrida'
 *     responses:
 *       200:
 *         description: Corrida cancelada sem cobrança.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespostaCorrida'
 *       400:
 *         description: Motivo inválido.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Acesso negado.
 *       404:
 *         description: Corrida não encontrada.
 *       409:
 *         description: Corrida já iniciada ou encerrada.
 *       500:
 *         description: Erro interno do servidor.
 */

/**
 * @swagger
 * /api/corrida/{id}/encerrar-antecipadamente:
 *   post:
 *     tags: [Corridas]
 *     summary: Encerrar uma corrida antecipadamente
 *     description: |
 *       Encerra uma corrida em andamento e calcula a cobrança
 *       proporcional à distância percorrida, utilizando os
 *       registros GPS existentes.
 *
 *       A implementação atual exige pontos GPS suficientes.
 *       A coleta autenticada e a validação antifraude do percurso
 *       ainda precisam ser concluídas antes do uso em produção.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MotivoEncerramentoCorrida'
 *     responses:
 *       200:
 *         description: Corrida encerrada antecipadamente.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespostaCorrida'
 *       400:
 *         description: Dados inválidos.
 *       401:
 *         description: Não autenticado.
 *       403:
 *         description: Acesso negado.
 *       404:
 *         description: Corrida não encontrada.
 *       409:
 *         description: Corrida não está em andamento ou GPS insuficiente.
 *       500:
 *         description: Erro interno do servidor.
 */
