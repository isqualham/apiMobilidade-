/**
 * @swagger
 * /api/photo/{tipo}/{id}:
 *   parameters:
 *     - in: path
 *       name: tipo
 *       required: true
 *       description: Tipo de registro que possui a foto.
 *       schema:
 *         type: string
 *         enum:
 *           - usuario
 *           - veiculo
 *     - in: path
 *       name: id
 *       required: true
 *       description: UUID do usuário ou veículo.
 *       schema:
 *         type: string
 *         format: uuid
 *
 *   post:
 *     tags:
 *       - Fotos
 *     summary: Enviar ou substituir foto
 *     description: Envia uma foto de perfil ou veículo para o Cloudflare R2. A imagem é convertida para WebP. Somente o proprietário autenticado pode modificar a foto.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Imagem JPEG, PNG ou WebP com até 5 MB.
 *     responses:
 *       200:
 *         description: Foto enviada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Foto enviada com sucesso.
 *                 imagemUrl:
 *                   type: string
 *                   example: /api/photo/usuario/550e8400-e29b-41d4-a716-446655440000
 *       400:
 *         description: Parâmetros inválidos ou imagem corrompida.
 *       401:
 *         description: Token ausente, inválido ou expirado.
 *       404:
 *         description: Registro não encontrado ou acesso não autorizado.
 *       409:
 *         description: Foto alterada por outra requisição.
 *       413:
 *         description: Imagem ou requisição muito grande.
 *       415:
 *         description: Tipo de conteúdo não suportado.
 *       500:
 *         description: Erro interno do servidor.
 *
 *   get:
 *     tags:
 *       - Fotos
 *     summary: Consultar foto
 *     description: Retorna a imagem WebP armazenada no bucket privado do Cloudflare R2. Exige autenticação e autorização do proprietário.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Imagem retornada com sucesso.
 *         content:
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Tipo ou UUID inválido.
 *       401:
 *         description: Token ausente, inválido ou expirado.
 *       404:
 *         description: Foto não encontrada ou acesso não autorizado.
 *       500:
 *         description: Erro interno do servidor.
 *
 *   delete:
 *     tags:
 *       - Fotos
 *     summary: Remover foto
 *     description: Remove a foto do registro e solicita a exclusão do objeto no Cloudflare R2. Somente o proprietário autenticado pode remover a imagem.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Foto removida com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensagem:
 *                   type: string
 *                   example: Foto removida com sucesso.
 *       400:
 *         description: Tipo ou UUID inválido.
 *       401:
 *         description: Token ausente, inválido ou expirado.
 *       404:
 *         description: Registro não encontrado ou acesso não autorizado.
 *       409:
 *         description: Foto alterada por outra requisição.
 *       500:
 *         description: Erro interno do servidor.
 */
