const express = require('express');
const path = require('path');
const router = express.Router();

const customerController = require('../controllers/customerController');

// API Routes
// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', customerController.getDashboardStats);

// GET /api/dashboard/trends - Get health score trends over time
router.get('/trends', customerController.getHealthTrends);

// GET /api/dashboard/usage-trends - Get usage trends over time
router.get('/usage-trends', customerController.getUsageTrends);

// Static file serving (for serving dashboard HTML if needed)
// GET /api/dashboard - Serve the dashboard HTML file
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
});

// Serve static assets
router.use('/static', express.static(path.join(__dirname, '../../public')));

module.exports = router;
