const express = require('express');
const SearchService = require('../services/SearchService');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello Asksuite World!');
});

router.post('/search', async (req, res) => {
    try {
        const { checkin, checkout } = req.body;

        if (!checkin || !checkout) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: 'Both checkin and checkout dates are required',
                expectedFormat: 'YYYY-MM-DD'
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(checkin) || !dateRegex.test(checkout)) {
            return res.status(400).json({
                error: 'Invalid date format',
                message: 'Dates must be in YYYY-MM-DD format',
                received: { checkin, checkout }
            });
        }

        const today = new Date();
        const checkinDate = new Date(checkin);
        const checkoutDate = new Date(checkout);
        if (checkinDate < today || checkoutDate < today) {
            return res.status(400).json({
                error: 'Invalid date',
                message: 'Dates cannot be in the past'
            });
        }

        if (checkoutDate <= checkinDate) {
            return res.status(400).json({
                error: 'Invalid date',
                message: 'Checkout date must be after checkin date'
            });
        }

        console.log(`Searching for rooms from ${checkin} to ${checkout}`);

        const rooms = await SearchService.search(checkin, checkout);

        res.json(rooms);

    } catch (error) {
        console.error('Error in /search endpoint:', error);

        if (error.message.includes('Invalid date format') ||
            error.message.includes('Checkout date must be after checkin')) {
            return res.status(400).json({
                error: 'Invalid date parameters',
                message: error.message
            });
        }

        if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
            return res.status(408).json({
                error: 'Request timeout',
                message: 'The website took too long to respond. Please try again later.'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'An error occurred while searching for rooms. Please try again later.'
        });
    }
});

module.exports = router;
