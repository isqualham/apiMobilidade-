/**
 * @swagger
 * components:
 *   schemas:
 *     ResumoConsultaCorrida:
 *       type: object
 *       required:
 *         - id
 *         - status
 *         - categoriaVeiculoId
 *         - distanciaKm
 *         - valorTotal
 *         - valorFinalCobrado
 *         - createdAt
 *       properties:
 *         id:
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
 *         categoriaVeiculoId:
 *           type: string
 *           format: uuid
 *         distanciaKm:
 *           type: number
 *         valorTotal:
 *           type: number
 *         valorFinalCobrado:
 *           type: number
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     DetalheConsultaCorrida:
 *       type: object
 *       required:
 *         - id
 *         - status
 *         - categoriaVeiculoId
 *         - distanciaKm
 *         - valorTotal
 *         - valorFinalCobrado
 *         - createdAt
 *         - papel
 *         - origem
 *         - destino
 *         - valorKmAplicado
 *         - distanciaPercorridaKm
 *         - dataAceite
 *         - dataInicio
 *         - dataFinalizacao
 *         - dataCancelamento
 *         - veiculo
 *       properties:
 *         id:
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
 *         categoriaVeiculoId:
 *           type: string
 *           format: uuid
 *         distanciaKm:
 *           type: number
 *         valorTotal:
 *           type: number
 *         valorFinalCobrado:
 *           type: number
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         papel:
 *           type: string
 *           enum:
 *             - passageiro
 *             - prestador
 *         origem:
 *           type: object
 *           required:
 *             - latitude
 *             - longitude
 *             - endereco
 *           properties:
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             endereco:
 *               type: string
 *         destino:
 *           type: object
 *           required:
 *             - latitude
 *             - longitude
 *             - endereco
 *           properties:
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             endereco:
 *               type: string
 *         valorKmAplicado:
 *           type: number
 *         distanciaPercorridaKm:
 *           type: number
 *           nullable: true
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
 *         veiculo:
 *           type: object
 *           required:
 *             - placa
 *             - marca
 *             - modelo
 *             - cor
 *           properties:
 *             placa:
 *               type: string
 *             marca:
 *               type: string
 *             modelo:
 *               type: string
 *             cor:
 *               type: string
 *               nullable: true
 *           nullable: true
 *     OfertaConsultaCorrida:
 *       type: object
 *       required:
 *         - id
 *         - status
 *         - categoriaVeiculoId
 *         - distanciaKm
 *         - valorTotal
 *         - createdAt
 *         - origemAproximada
 *         - destinoAproximado
 *       properties:
 *         id:
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
 *         categoriaVeiculoId:
 *           type: string
 *           format: uuid
 *         distanciaKm:
 *           type: number
 *         valorTotal:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         origemAproximada:
 *           type: object
 *           required:
 *             - latitude
 *             - longitude
 *           properties:
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *         destinoAproximado:
 *           type: object
 *           required:
 *             - latitude
 *             - longitude
 *           properties:
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *     PaginaHistoricoCorrida:
 *       type: object
 *       required:
 *         - corridas
 *         - proximoCursor
 *       properties:
 *         corridas:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/ResumoConsultaCorrida"
 *         proximoCursor:
 *           type: string
 *           nullable: true
 *     PaginaOfertasCorrida:
 *       type: object
 *       required:
 *         - corridas
 *         - proximoCursor
 *       properties:
 *         corridas:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/OfertaConsultaCorrida"
 *         proximoCursor:
 *           type: string
 *           nullable: true
 * /api/corrida:
 *   get:
 *     tags:
 *       - Corridas
 *     summary: Histórico próprio de corridas
 *     description: "Somente FINALIZADA, CANCELADA e ENCERRADA_ANTECIPADAMENTE. Ordem
 *       createdAt DESC, id DESC. Não inclui ativas. Sem total; paginação por
 *       cursor. Respostas privadas com Cache-Control: private, no-store.
 *       Parâmetros desconhecidos/repetidos são rejeitados."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limite
 *         required: false
 *         description: Quantidade máxima de itens.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - in: query
 *         name: cursor
 *         required: false
 *         description: Cursor opaco devolvido pela página anterior. Reutilize os mesmos
 *           filtros e veículo.
 *         schema:
 *           type: string
 *           maxLength: 256
 *       - in: query
 *         name: papel
 *         required: false
 *         description: Filtra o papel do usuário autenticado; nunca troca a identidade.
 *         schema:
 *           type: string
 *           enum:
 *             - todos
 *             - passageiro
 *             - prestador
 *           default: todos
 *       - in: query
 *         name: status
 *         required: false
 *         description: Filtro opcional por estado encerrado.
 *         schema:
 *           type: string
 *           enum:
 *             - FINALIZADA
 *             - CANCELADA
 *             - ENCERRADA_ANTECIPADAMENTE
 *     responses:
 *       "200":
 *         description: Consulta realizada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PaginaHistoricoCorrida"
 *       "400":
 *         description: Parâmetros inválidos, desconhecidos ou repetidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "401":
 *         description: JWT ausente, inválido/expirado ou usuário inativo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "500":
 *         description: Erro interno.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 * /api/corrida/disponiveis:
 *   get:
 *     tags:
 *       - Corridas
 *     summary: Ofertas disponíveis para um veículo próprio
 *     description: "Exige usuário ativo, prestador APROVADO, ONLINE com o veículo selecionado e livre, veículo próprio APROVADO
 *       e ativo, categoria e tipo ativos. Exclui ofertas recusadas por este prestador. Apenas SOLICITADA sem prestador, de outro
 *       passageiro ativo e categoria compatível. Origem/destino aproximados a duas
 *       casas decimais, sem endereço ou identidade. Ordem createdAt ASC, id ASC. A
 *       consulta não reserva a corrida. Respostas privadas com Cache-Control:
 *       private, no-store. Parâmetros desconhecidos/repetidos são rejeitados."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limite
 *         required: false
 *         description: Quantidade máxima de itens.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - in: query
 *         name: cursor
 *         required: false
 *         description: Cursor opaco devolvido pela página anterior. Reutilize os mesmos
 *           filtros e veículo.
 *         schema:
 *           type: string
 *           maxLength: 256
 *       - in: query
 *         name: veiculoId
 *         required: false
 *         description: Opcional; usa o veículo Online no servidor. Se informado, deve coincidir com a seleção.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       "200":
 *         description: Consulta realizada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/PaginaOfertasCorrida"
 *       "400":
 *         description: Parâmetros inválidos, desconhecidos ou repetidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "401":
 *         description: JWT ausente, inválido/expirado ou usuário inativo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "403":
 *         description: Prestador ou veículo inelegível.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "409":
 *         description: Prestador ocupado ou consulta de ativa ambígua.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "500":
 *         description: Erro interno.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 * /api/corrida/ativa:
 *   get:
 *     tags:
 *       - Corridas
 *     summary: Corrida ativa do usuário
 *     description: "Status SOLICITADA, ACEITA, PRESTADOR_A_CAMINHO e EM_ANDAMENTO.
 *       Somente participantes; aprovação atual não impede leitura da própria
 *       corrida. Ausência retorna corrida=null. Mais de uma ativa retorna 409:
 *       selecione papel. Persistindo, requer suporte. Respostas privadas com
 *       Cache-Control: private, no-store. Parâmetros desconhecidos/repetidos são
 *       rejeitados."
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: papel
 *         required: false
 *         description: Filtra o papel do usuário autenticado; nunca troca a identidade.
 *         schema:
 *           type: string
 *           enum:
 *             - todos
 *             - passageiro
 *             - prestador
 *           default: todos
 *     responses:
 *       "200":
 *         description: Consulta realizada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - corrida
 *               properties:
 *                 corrida:
 *                   type: object
 *                   required:
 *                     - id
 *                     - status
 *                     - categoriaVeiculoId
 *                     - distanciaKm
 *                     - valorTotal
 *                     - valorFinalCobrado
 *                     - createdAt
 *                     - papel
 *                     - origem
 *                     - destino
 *                     - valorKmAplicado
 *                     - distanciaPercorridaKm
 *                     - dataAceite
 *                     - dataInicio
 *                     - dataFinalizacao
 *                     - dataCancelamento
 *                     - veiculo
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum:
 *                         - SOLICITADA
 *                         - ACEITA
 *                         - PRESTADOR_A_CAMINHO
 *                         - EM_ANDAMENTO
 *                         - FINALIZADA
 *                         - CANCELADA
 *                         - ENCERRADA_ANTECIPADAMENTE
 *                     categoriaVeiculoId:
 *                       type: string
 *                       format: uuid
 *                     distanciaKm:
 *                       type: number
 *                     valorTotal:
 *                       type: number
 *                     valorFinalCobrado:
 *                       type: number
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     papel:
 *                       type: string
 *                       enum:
 *                         - passageiro
 *                         - prestador
 *                     origem:
 *                       type: object
 *                       required:
 *                         - latitude
 *                         - longitude
 *                         - endereco
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                         endereco:
 *                           type: string
 *                     destino:
 *                       type: object
 *                       required:
 *                         - latitude
 *                         - longitude
 *                         - endereco
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                         endereco:
 *                           type: string
 *                     valorKmAplicado:
 *                       type: number
 *                     distanciaPercorridaKm:
 *                       type: number
 *                       nullable: true
 *                     dataAceite:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     dataInicio:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     dataFinalizacao:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     dataCancelamento:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     veiculo:
 *                       type: object
 *                       required:
 *                         - placa
 *                         - marca
 *                         - modelo
 *                         - cor
 *                       properties:
 *                         placa:
 *                           type: string
 *                         marca:
 *                           type: string
 *                         modelo:
 *                           type: string
 *                         cor:
 *                           type: string
 *                           nullable: true
 *                       nullable: true
 *                   nullable: true
 *       "400":
 *         description: Parâmetros inválidos, desconhecidos ou repetidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "401":
 *         description: JWT ausente, inválido/expirado ou usuário inativo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "409":
 *         description: Prestador ocupado ou consulta de ativa ambígua.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "500":
 *         description: Erro interno.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 * "/api/corrida/{id}":
 *   get:
 *     tags:
 *       - Corridas
 *     summary: Detalhes privados para participantes
 *     description: "Somente passageiro e prestador vinculados. Administrador não
 *       possui exceção. Inexistente e acesso de terceiro retornam o mesmo 404. Não
 *       aceita parâmetros de consulta. Respostas privadas com Cache-Control:
 *       private, no-store. Parâmetros desconhecidos/repetidos são rejeitados."
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
 *       "200":
 *         description: Consulta realizada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - corrida
 *               properties:
 *                 corrida:
 *                   $ref: "#/components/schemas/DetalheConsultaCorrida"
 *       "400":
 *         description: Parâmetros inválidos, desconhecidos ou repetidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "401":
 *         description: JWT ausente, inválido/expirado ou usuário inativo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "404":
 *         description: Corrida não encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 *       "500":
 *         description: Erro interno.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErroCorrida"
 */
