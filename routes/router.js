const express = require('express');
const SearchService = require('../services/SearchService');
const { searchRequestSchema } = require('../validators/searchValidator');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello Asksuite World!');
});

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
