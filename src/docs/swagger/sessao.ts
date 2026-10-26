/**
 * @swagger
 * components:
 *   schemas:
 *     EntradaRefresh:
 *       type: object
 *       additionalProperties: false
 *       required: [refreshToken]
 *       properties:
 *         refreshToken:
 *           type: string
 *           pattern: '^[A-Za-z0-9_-]{43}$'
 *           description: Token opaco recebido no login ou na última renovação. Nunca enviar em URL.
 *     ParTokens:
 *       type: object
 *       required: [token, refreshToken]
 *       properties:
 *         token:
 *           type: string
 *           description: Access JWT válido por 1 hora, usado como Bearer.
 *         refreshToken:
 *           type: string
 *           description: Token opaco de uso único, válido por 7 dias a partir da emissão.
 *     LoginSessao:
 *       type: object
 *       required: [id, nome, email, administrador, prestador, statusAprovacao, telefoneVerificado, token, refreshToken]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         nome:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         administrador:
 *           type: boolean
 *         prestador:
 *           type: boolean
 *         statusAprovacao:
 *           type: string
 *           nullable: true
 *           enum: [PENDENTE, APROVADO, REJEITADO, null]
 *         telefoneVerificado:
 *           type: boolean
 *         token:
 *           type: string
 *         refreshToken:
 *           type: string
 *     ErroSessao:
 *       type: object
 *       required: [erro]
 *       properties:
 *         erro:
 *           type: string
 * /api/auth/refresh:
 *   post:
 *     tags: [Autenticação]
 *     summary: Renovar sessão e rotacionar refresh token
 *     description: |
 *       Não exige access token. Recebe apenas refreshToken no JSON.
 *       Rotaciona o token e estende sua validade por 7 dias. Resposta no-store.
 *       Reutilização revoga toda a sessão, inclusive seus access tokens.
 *       Renovações concorrentes do mesmo token são tratadas como reutilização:
 *       no máximo uma vence e a sessão é revogada. O cliente deve serializar chamadas.
 *       Não altera corridas. Um novo login permite recuperar a corrida ativa.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EntradaRefresh'
 *     responses:
 *       '200':
 *         description: Novos tokens. Descartar o refresh anterior.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParTokens'
 *       '400':
 *         description: JSON inválido, formato inválido ou campos extras.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSessao'
 *       '401':
 *         description: Token desconhecido, expirado, revogado, reutilizado ou usuário inativo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErroSessao'
 *       '500':
 *         description: Não foi possível processar a sessão.
 * /api/auth/logout:
 *   post:
 *     tags: [Autenticação]
 *     summary: Revogar a sessão correspondente ao refresh token
 *     description: |
 *       Não exige access token. Revoga a sessão inclusive se o refresh informado já foi
 *       rotacionado. Idempotente para tokens bem formados desconhecidos ou revogados.
 *       Não encerra corridas nem revoga outros logins do mesmo usuário.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EntradaRefresh'
 *     responses:
 *       '204':
 *         description: Logout processado, sem corpo e sem cache.
 *       '400':
 *         description: JSON inválido, formato inválido ou campos extras.
 *       '500':
 *         description: Não foi possível processar a sessão.
 */
