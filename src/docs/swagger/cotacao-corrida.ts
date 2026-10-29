/**
 * @swagger
 * /api/corrida/cotacao:
 *   post:
 *     tags: [Corridas]
 *     summary: Calcular cotação oficial estimada sem criar corrida
 *     description: Usuário autenticado ativo. Reutiliza categoria, tarifa, OSRM e cálculo da solicitação. Não grava dados, reserva motorista ou fixa tarifa. Ao solicitar, o servidor recalcula com tarifa e rota vigentes. Duração é estimativa do trajeto origem-destino, não ETA do motorista nem cobrança por minuto. Endereços são opcionais nesta consulta. Campos desconhecidos, distância e preço enviados pelo cliente são rejeitados.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: false
 *             required: [categoriaVeiculoId, origemLatitude, origemLongitude, destinoLatitude, destinoLongitude]
 *             properties:
 *               categoriaVeiculoId: {type: string, format: uuid}
 *               origemLatitude: {type: number, minimum: -90, maximum: 90}
 *               origemLongitude: {type: number, minimum: -180, maximum: 180}
 *               destinoLatitude: {type: number, minimum: -90, maximum: 90}
 *               destinoLongitude: {type: number, minimum: -180, maximum: 180}
 *               origemEndereco: {type: string, minLength: 1, maxLength: 500}
 *               destinoEndereco: {type: string, minLength: 1, maxLength: 500}
 *     responses:
 *       200:
 *         description: Cotação atual. Resposta privada sem cache. Nenhuma corrida criada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [categoriaVeiculoId, valorTotal, distanciaKm, duracaoSegundos]
 *               properties:
 *                 categoriaVeiculoId: {type: string, format: uuid}
 *                 valorTotal: {type: number, minimum: 0, maximum: 99999999.99, description: Valor estimado em reais com arredondamento monetário de duas casas.}
 *                 distanciaKm: {type: number, description: Distância viária calculada no servidor em quilômetros.}
 *                 duracaoSegundos: {type: number, nullable: true, minimum: 0, description: Duração estimada do trajeto em segundos; null quando ausente no provedor.}
 *       400:
 *         description: Entrada ou JSON inválidos.
 *       401:
 *         description: Autenticação inválida ou usuário inativo.
 *       404:
 *         description: Categoria ou tipo inativo/inexistente ou tarifa ativa ausente.
 *       422:
 *         description: Sem rota ou tarifa/valor inválido.
 *       429:
 *         description: Limite de consultas ao serviço de rotas.
 *       502:
 *         description: Resposta inválida do provedor.
 *       503:
 *         description: Provedor indisponível ou não configurado.
 *       504:
 *         description: Timeout do provedor.
 *       500:
 *         description: Falha interna.
 */
export {};
