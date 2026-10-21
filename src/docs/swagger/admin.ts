/**
 * @swagger
 * /api/admin/me:
 *   get:
 *     tags:
 *       - Administração
 *     summary: Consultar administrador autenticado
 *     description: Acesso exclusivo a usuários com permissão administrativa.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Administrador autenticado.
 *       401:
 *         description: Token ausente ou inválido.
 *       403:
 *         description: Usuário sem permissão administrativa.
 *       500:
 *         description: Erro interno do servidor.
 *
 * /api/admin/usuarios:
 *   get:
 *     tags:
 *       - Administração
 *     summary: Listar usuários
 *     description: Lista usuários com paginação e filtros. Acesso exclusivo a administradores.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número da página.
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Quantidade de registros por página.
 *       - in: query
 *         name: pesquisa
 *         schema:
 *           type: string
 *         description: Pesquisa por nome, e-mail ou CPF.
 *       - in: query
 *         name: ativo
 *         schema:
 *           type: boolean
 *         description: Filtra usuários ativos ou inativos.
 *     responses:
 *       200:
 *         description: Lista de usuários e dados de paginação.
 *       400:
 *         description: Parâmetros inválidos.
 *       401:
 *         description: Token ausente ou inválido.
 *       403:
 *         description: Usuário sem permissão administrativa.
 *       500:
 *         description: Erro interno do servidor.
 */
