/**
 * Validate customer ID parameter
 */
const validateCustomerId = (req, res, next) => {
    const customerId = parseInt(req.params.id);

    if (isNaN(customerId) || customerId <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Invalid customer ID',
            message: 'Customer ID must be a positive integer'
        });
    }

    req.params.id = customerId;
    next();
};

/**
 * Validate event data
 */
const validateEventData = (req, res, next) => {
    const { eventType } = req.body;

    if (!eventType) {
        return res.status(400).json({
            success: false,
            error: 'Missing required field',
            message: 'eventType is required'
        });
    }

    const validEventTypes = ['login', 'feature_used', 'api_call', 'page_view', 'support_ticket', 'payment'];
    if (!validEventTypes.includes(eventType)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid event type',
            message: `eventType must be one of: ${validEventTypes.join(', ')}`
        });
    }

    next();
};

module.exports = {
    validateCustomerId,
    validateEventData
};
