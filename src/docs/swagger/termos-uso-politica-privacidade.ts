/**
 * @openapi
 * /api/termos-uso-politica-privacidade:
 *   get:
 *     tags:
 *       - Documentos Legais
 *     summary: Consultar termos de uso e política de privacidade ativos
 *     description: Retorna a versão vigente dos termos de uso e da política de privacidade.
 *     responses:
 *       200:
 *         description: Documentos legais ativos encontrados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 termosUso:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     versao:
 *                       type: string
 *                     conteudo:
 *                       type: string
 *                     ativo:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                 politicaPrivacidade:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     versao:
 *                       type: string
 *                     conteudo:
 *                       type: string
 *                     ativo:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Um ou ambos os documentos ativos não foram encontrados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 *                 termosUso:
 *                   type: object
 *                   nullable: true
 *                 politicaPrivacidade:
 *                   type: object
 *                   nullable: true
 *       500:
 *         description: Erro interno ao consultar os documentos legais.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 erro:
 *                   type: string
 */
export {};
