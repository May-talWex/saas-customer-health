const express = require('express');
const router = express.Router();

const customerController = require('../controllers/customerController');
const { validateCustomerId, validateEventData } = require('../middleware/validation');

// GET /api/customers - List all customers with health scores
router.get('/', customerController.getAllCustomers);

// GET /api/customers/:id/health - Detailed health breakdown
router.get('/:id/health', validateCustomerId, customerController.getCustomerHealth);

// GET /api/customers/:id/health-data/:component - Get raw data for health component
router.get('/:id/health-data/:component', validateCustomerId, customerController.getHealthComponentData);

// POST /api/customers/:id/events - Record customer activity
router.post('/:id/events', validateCustomerId, validateEventData, customerController.recordEvent);

module.exports = router;
