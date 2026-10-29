/**
 * @swagger
 * components:
 *   schemas:
 *     VeiculoAdministrativo:
 *       type: object
 *       required: [id, prestadorId, categoriaVeiculoId, placa, marca, modelo, ano, ativo, statusAprovacao, versao]
 *       properties:
 *         id: {type: string, format: uuid}
 *         prestadorId: {type: string, format: uuid}
 *         categoriaVeiculoId: {type: string, format: uuid}
 *         placa: {type: string}
 *         marca: {type: string, maxLength: 80}
 *         modelo: {type: string, maxLength: 100}
 *         ano: {type: integer}
 *         cor: {type: string, nullable: true, maxLength: 50}
 *         imagemUrl: {type: string, nullable: true, maxLength: 500, description: Imagem opcional. Não comprova aprovação.}
 *         ativo: {type: boolean}
 *         statusAprovacao: {type: string, enum: [PENDENTE, APROVADO, REJEITADO, SUSPENSO]}
 *         versao: {type: integer, minimum: 0}
 *         createdAt: {type: string, format: date-time}
 *         updatedAt: {type: string, format: date-time}
 *     AuditoriaVeiculo:
 *       type: object
 *       properties:
 *         id: {type: string, format: uuid}
 *         veiculoId: {type: string, format: uuid}
 *         autorId: {type: string, format: uuid}
 *         acao: {type: string, enum: [DECISAO_ADMINISTRATIVA, ALTERACAO_CADASTRAL]}
 *         statusAnterior: {type: string, enum: [PENDENTE, APROVADO, REJEITADO, SUSPENSO]}
 *         statusNovo: {type: string, enum: [PENDENTE, APROVADO, REJEITADO, SUSPENSO]}
 *         motivo: {type: string}
 *         versao: {type: integer}
 *         dados: {type: object, description: Snapshot dos dados relevantes avaliados; alterações cadastrais incluem antes e depois.}
 *         createdAt: {type: string, format: date-time}
 * /api/admin/veiculos:
 *   get:
 *     tags: [Veículos]
 *     summary: Listar veículos para avaliação administrativa
 *     description: Somente administrador ativo autenticado. Sem filtro retorna todos os status. Ordem createdAt DESC e id DESC. Resposta sem cache.
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: query, name: status, schema: {type: string, enum: [PENDENTE, APROVADO, REJEITADO, SUSPENSO]}}
 *       - {in: query, name: limite, schema: {type: integer, minimum: 1, maximum: 50, default: 20}}
 *       - {in: query, name: cursor, schema: {type: string, format: uuid}}
 *     responses:
 *       '200':
 *         description: Página de veículos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 itens: {type: array, items: {$ref: '#/components/schemas/VeiculoAdministrativo'}}
 *                 proximoCursor: {type: string, format: uuid, nullable: true}
 *       '400': {description: "Parâmetros inválidos ou repetidos."}
 *       '401': {description: "Autenticação inválida."}
 *       '403': {description: "Exige administrador ativo."}
 *       '409': {description: "Conflito concorrente; consulte novamente."}
 *       '500': {description: "Falha interna."}
 * /api/admin/veiculos/{id}/aprovacao:
 *   patch:
 *     tags: [Veículos]
 *     summary: Aprovar, rejeitar ou suspender veículo
 *     description: 'Somente administrador ativo. PENDENTE permite APROVADO/REJEITADO/SUSPENSO; APROVADO permite SUSPENSO; REJEITADO permite APROVADO/SUSPENSO; SUSPENSO permite APROVADO/REJEITADO. Repetição e versão antiga retornam 409. Aprovar exige veículo/categoria/tipo/usuário ativos e prestador aprovado, sem obrigatoriedade de imagem. A decisão é auditada atomicamente. Rejeitar ou suspender remove seleção Online, sem cancelar corridas existentes.'
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [statusAprovacao, motivo, versao]
 *             properties:
 *               statusAprovacao: {type: string, enum: [APROVADO, REJEITADO, SUSPENSO]}
 *               motivo: {type: string, minLength: 5, maxLength: 1000}
 *               versao: {type: integer, minimum: 0, maximum: 2147483646}
 *           example: {statusAprovacao: APROVADO, motivo: Dados do veículo conferidos, versao: 0}
 *     responses:
 *       '200':
 *         description: Veículo atualizado; versão incrementada.
 *         content:
 *           application/json:
 *             schema: {$ref: '#/components/schemas/VeiculoAdministrativo'}
 *       '400': {description: "ID, motivo, versão ou campos inválidos."}
 *       '401': {description: "Autenticação inválida."}
 *       '403': {description: "Exige administrador ativo."}
 *       '404': {description: "Veículo inexistente."}
 *       '409': {description: "Versão antiga, transição inválida, veículo inelegível para aprovação ou conflito concorrente."}
 *       '500': {description: "Falha interna."}
 * /api/admin/veiculos/{id}/historico:
 *   get:
 *     tags: [Veículos]
 *     summary: Consultar auditoria do veículo
 *     description: Somente administrador ativo. Ordem createdAt DESC e id DESC. Sem endpoint para editar ou excluir histórico.
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *       - {in: query, name: limite, schema: {type: integer, minimum: 1, maximum: 50, default: 20}}
 *       - {in: query, name: cursor, schema: {type: string, format: uuid}}
 *     responses:
 *       '200':
 *         description: Histórico, inclusive motivos e autor de cada decisão.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 itens: {type: array, items: {$ref: '#/components/schemas/AuditoriaVeiculo'}}
 *                 proximoCursor: {type: string, format: uuid, nullable: true}
 *       '400': {description: "Parâmetros inválidos."}
 *       '401': {description: "Autenticação inválida."}
 *       '403': {description: "Exige administrador ativo."}
 *       '404': {description: "Veículo inexistente."}
 *       '409': {description: "Conflito concorrente; consulte novamente."}
 *       '500': {description: "Falha interna."}
 * /api/veiculos/{id}:
 *   patch:
 *     tags: [Veículos]
 *     summary: Alterar veículo próprio com controle de versão
 *     description: 'Prestador aprovado e usuário ativo, proprietário do veículo. Exige versão e ao menos um campo. Placa/categoria/marca/modelo/ano/cor alterados exigem reaprovação (PENDENTE); SUSPENSO permanece SUSPENSO. Imagem é opcional e não exige reaprovação. Ativo é independente da aprovação. Alterações relevantes ou desativação removem seleção Online. Corrida ativa impede edição. Edição não concede aprovação; alterações são auditadas. Campos omitidos são preservados.'
 *     security: [{bearerAuth: []}]
 *     parameters:
 *       - {in: path, name: id, required: true, schema: {type: string, format: uuid}}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [versao]
 *             minProperties: 2
 *             properties:
 *               versao: {type: integer, minimum: 0, maximum: 2147483646}
 *               categoriaVeiculoId: {type: string, format: uuid}
 *               placa: {type: string, description: Placa brasileira antiga ou Mercosul; normalizada pelo servidor.}
 *               marca: {type: string, minLength: 1, maxLength: 80}
 *               modelo: {type: string, minLength: 1, maxLength: 100}
 *               ano: {type: integer, minimum: 1900, description: Máximo ano atual mais um.}
 *               cor: {type: string, nullable: true, maxLength: 50}
 *               imagemUrl: {type: string, nullable: true, maxLength: 500, description: URL HTTP/HTTPS opcional; null remove imagem.}
 *               ativo: {type: boolean}
 *     responses:
 *       '200':
 *         description: Veículo atualizado; reenvio sem mudanças preserva versão.
 *         content:
 *           application/json:
 *             schema: {$ref: '#/components/schemas/VeiculoAdministrativo'}
 *       '400': {description: "Dados inválidos ou categoria/tipo inativo."}
 *       '401': {description: "Autenticação inválida."}
 *       '404': {description: "Veículo não encontrado para o prestador autorizado."}
 *       '409': {description: "Corrida ativa, versão antiga, placa duplicada ou conflito concorrente."}
 *       '500': {description: "Falha interna."}
 */
export {};
