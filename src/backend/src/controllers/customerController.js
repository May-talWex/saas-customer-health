const HealthScoreCalculator = require('../services/healthScoreCalculator');
const CustomerService = require('../services/customerService');

// Create instances once
const healthCalculator = new HealthScoreCalculator();
const customerService = new CustomerService();

/**
 * GET /api/customers
 * List all customers with their health scores
 */
async function getAllCustomers(req, res, next) {
    try {
        const { page = 1, limit = 20, segment, healthLevel, sortBy = 'overall_score', sortOrder = 'desc' } = req.query;

        const customers = await customerService.getAllCustomers({
            page: parseInt(page),
            limit: parseInt(limit),
            segment,
            healthLevel,
            sortBy,
            sortOrder
        });

        res.json({
            success: true,
            data: customers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: await customerService.getTotalCustomerCount()
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/customers/:id/health
 * Get detailed health breakdown for a specific customer
 */
async function getCustomerHealth(req, res, next) {
    try {
        const customerId = parseInt(req.params.id);

        // Get customer basic info
        const customer = await customerService.getCustomerById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

        // Calculate detailed health score
        const healthScore = await healthCalculator.calculateHealthScore(customerId);

        // Get additional metrics
        const metrics = await customerService.getCustomerMetrics(customerId);

        res.json({
            success: true,
            data: {
                customer: {
                    id: customer.id,
                    companyName: customer.company_name,
                    segment: customer.segment,
                    planType: customer.plan_type,
                    monthlyRevenue: customer.monthly_revenue,
                    signupDate: customer.signup_date,
                    lastLoginDate: customer.last_login_date
                },
                healthScore,
                metrics
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
async function getDashboardStats(req, res, next) {
    try {
        // Use a direct database query to get accurate stats
        const stats = await customerService.getDashboardStats();

        res.json({
            success: true,
            data: {
                stats,
                averageHealthScore: stats.averageHealthScore
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/dashboard/trends
 * Get health score trends over time
 */
async function getHealthTrends(req, res, next) {
    try {
        const { months = 6 } = req.query;

        // Get health scores over time from database
        const trends = await customerService.getHealthTrends(parseInt(months));

        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/dashboard/usage-trends
 * Get usage trends over time
 */
async function getUsageTrends(req, res, next) {
    try {
        const { months = 6 } = req.query;

        // Get usage trends from database
        const trends = await customerService.getUsageTrends(parseInt(months));

        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/customers/:id/health-data/:component
 * Get raw data for a specific health component
 */
async function getHealthComponentData(req, res, next) {
    try {
        const customerId = parseInt(req.params.id);
        const component = req.params.component;

        // Verify customer exists
        const customer = await customerService.getCustomerById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

        // Get raw data for the specific component
        const data = await customerService.getHealthComponentData(customerId, component);

        res.json({
            success: true,
            data: {
                customer: {
                    id: customer.id,
                    companyName: customer.company_name
                },
                component,
                data
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/customers/:id/events
 * Record customer activity/event
 */
async function recordEvent(req, res, next) {
    try {
        const customerId = parseInt(req.params.id);
        const eventData = req.body;

        // Verify customer exists
        const customer = await customerService.getCustomerById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

        // Record the event
        const event = await customerService.recordEvent(customerId, eventData);

        // Recalculate health score after new event
        const healthScore = await healthCalculator.calculateHealthScore(customerId);

        res.status(201).json({
            success: true,
            data: {
                event,
                updatedHealthScore: healthScore.overallScore,
                healthLevel: healthScore.healthLevel
            },
            message: 'Event recorded and health score updated'
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getAllCustomers,
    getCustomerHealth,
    getDashboardStats,
    getHealthTrends,
    getUsageTrends,
    getHealthComponentData,
    recordEvent
};