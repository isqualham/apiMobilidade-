/**
 * @swagger
 * /api/auth/senha/enviar-codigo:
 *   post:
 *     summary: Solicitar código para recuperação de senha
 *     description: Envia um código de verificação por SMS para o celular informado, caso esteja cadastrado e ativo.
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - telefone
 *             properties:
 *               telefone:
 *                 type: string
 *                 description: Telefone brasileiro com código do país e DDD.
 *                 example: "+5565999117323"
 *     responses:
 *       200:
 *         description: Solicitação processada. A resposta não informa se o telefone está cadastrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Se o telefone estiver cadastrado, você receberá um código por SMS.
 *       400:
 *         description: Telefone inválido ou corpo da requisição inválido.
 *       500:
 *         description: Serviço de SMS indisponível ou erro interno.
 *
 * /api/auth/senha/redefinir:
 *   post:
 *     summary: Redefinir senha
 *     description: Valida o código recebido por SMS e salva a nova senha do usuário.
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - telefone
 *               - codigo
 *               - novaSenha
 *               - confirmarSenha
 *             properties:
 *               telefone:
 *                 type: string
 *                 description: Telefone brasileiro com código do país e DDD.
 *                 example: "+5565999117323"
 *               codigo:
 *                 type: string
 *                 description: Código recebido por SMS.
 *                 example: "123456"
 *               novaSenha:
 *                 type: string
 *                 description: Nova senha com pelo menos 8 caracteres.
 *                 example: "MinhaSenha123"
 *               confirmarSenha:
 *                 type: string
 *                 description: Confirmação da nova senha.
 *                 example: "MinhaSenha123"
 *     responses:
 *       200:
 *         description: Senha redefinida com sucesso.
 *       400:
 *         description: Dados inválidos, código incorreto ou expirado.
 *       500:
 *         description: Serviço de verificação indisponível ou erro interno.
 */
