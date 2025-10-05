const express = require('express');
const SearchService = require('../services/SearchService');
const { searchRequestSchema } = require('../validators/searchValidator');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello Asksuite World!');
});

/**
 * @swagger
 * /search:
 *   post:
 *     summary: Busca acomodações disponíveis para o período informado.
 *     tags:
 *       - Reservation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - checkin
 *               - checkout
 *             properties:
 *               checkin:
 *                 type: string
 *                 format: date
 *                 example: 2025-12-19
 *               checkout:
 *                 type: string
 *                 format: date
 *                 example: 2025-12-23
 *     responses:
 *       200:
 *         description: Lista de acomodações disponíveis.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Accommodation'
 *             examples:
 *               success:
 *                 summary: Solicitação com disponibilidade encontrada.
 *                 value:
 *                   - name: Suíte Master
 *                     description: Quarto amplo com vista para o mar.
 *                     price: "R$ 450,00"
 *                     image: https://example.com/master.jpg
 *                   - name: Standard Duplo
 *                     description: Ideal para duas pessoas.
 *                     price: "R$ 280,00"
 *                     image: https://example.com/standard.jpg
 *       400:
 *         description: Parâmetros inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *             examples:
 *               missingField:
 *                 summary: Campo obrigatório ausente.
 *                 value:
 *                   error: VALIDATION_ERROR
 *                   message: Request validation failed
 *                   issues:
 *                     - path: checkin
 *                       message: "Checkin date is required"
 *                       code: invalid_type
 *               pastDate:
 *                 summary: Datas no passado.
 *                 value:
 *                   error: VALIDATION_ERROR
 *                   message: Request validation failed
 *                   issues:
 *                     - path: checkin
 *                       message: Checkin cannot be in the past
 *                       code: custom
 *                     - path: checkout
 *                       message: Checkout cannot be in the past
 *                       code: custom
 *               restriction:
*                 summary: Motor retornou tarifas com restrições.
*                 value:
*                   message: "Em 19/12/2025 é necessária estadia mínima de 4 dias"
*                   statusCode: 400
*                   payload:
*                     status: error
*                     codigo: todasTarifasComRestricao
*                     message: "Em 19/12/2025 é necessária estadia mínima de 4 dias"
*                   url: https://reservations3.fasthotel.com.br/reservaMotorCotar/214
 *       504:
 *         description: Tempo limite excedido ao acessar o site externo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TimeoutErrorResponse'
 *             examples:
 *               timeout:
 *                 summary: Motor não respondeu a tempo.
 *                 value:
 *                   error: NAVIGATION_TIMEOUT
 *                   message: The website took too long to respond. Please try again later.
 *                   details:
 *                     message: Navigation timeout of 30000 ms exceeded
 *       500:
 *         description: Erro interno inesperado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InternalServerErrorResponse'
 *             examples:
 *               unexpected:
 *                 summary: Falha não tratada na aplicação.
 *                 value:
 *                   error: INTERNAL_SERVER_ERROR
 *                   message: An unexpected error occurred. Please try again later.
 */
router.post('/search', async (req, res, next) => {
    try {
        const { checkin, checkout } = searchRequestSchema.parse(req.body);

        const rooms = await SearchService.search(checkin, checkout);

        res.json(rooms);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
