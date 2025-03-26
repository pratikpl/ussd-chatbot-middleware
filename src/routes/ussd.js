const express = require('express');
const router = express.Router();
const ussdController = require('../controllers/ussd');

// USSD endpoints
router.post('/session/:sessionId/start', ussdController.handleStart);
router.put('/session/:sessionId/response', ussdController.handleResponse);
router.put('/session/:sessionId/end', ussdController.handleEnd);

module.exports = router;