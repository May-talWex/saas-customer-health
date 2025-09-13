const request = require('supertest');
const express = require('express');

// Mock the services before importing the controller
const mockCustomerService = {
    getAllCustomers: jest.fn(),
    getTotalCustomerCount: jest.fn(),
    getCustomerById: jest.fn(),
    getCustomerMetrics: jest.fn(),
    getDashboardStats: jest.fn(),
    getHealthTrends: jest.fn(),
    getUsageTrends: jest.fn(),
    getHealthComponentData: jest.fn(),
    recordEvent: jest.fn()
};

const mockHealthCalculator = {
    calculateHealthScore: jest.fn()
};

// Mock the modules
jest.mock('../services/customerService', () => {
    return jest.fn().mockImplementation(() => mockCustomerService);
});

jest.mock('../services/healthScoreCalculator', () => {
    return jest.fn().mockImplementation(() => mockHealthCalculator);
});

// Import the controller after mocking
const customerController = require('../controllers/customerController');

describe('CustomerController - Simple Tests', () => {
    let app;

    beforeEach(() => {
        // Create Express app
        app = express();
        app.use(express.json());

        // Setup routes
        app.get('/api/customers', customerController.getAllCustomers);
        app.get('/api/customers/:id/health', customerController.getCustomerHealth);
        app.get('/api/dashboard/stats', customerController.getDashboardStats);
        app.get('/api/dashboard/trends', customerController.getHealthTrends);
        app.get('/api/dashboard/usage-trends', customerController.getUsageTrends);
        app.get('/api/customers/:id/health-data/:component', customerController.getHealthComponentData);
        app.post('/api/customers/:id/events', customerController.recordEvent);

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllCustomers', () => {
        test('should return customers with pagination', async () => {
            const mockCustomers = [
                { id: 1, company_name: 'Test Company', overall_score: 85 }
            ];
            const mockTotalCount = 100;

            mockCustomerService.getAllCustomers.mockResolvedValue(mockCustomers);
            mockCustomerService.getTotalCustomerCount.mockResolvedValue(mockTotalCount);

            const response = await request(app)
                .get('/api/customers')
                .query({ page: 1, limit: 20 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: mockCustomers,
                pagination: {
                    page: 1,
                    limit: 20,
                    total: mockTotalCount
                }
            });
        });

        test('should handle service errors', async () => {
            mockCustomerService.getAllCustomers.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/api/customers');

            expect(response.status).toBe(500);
        });
    });

    describe('getCustomerHealth', () => {
        test('should return customer health data when customer exists', async () => {
            const mockCustomer = {
                id: 1,
                company_name: 'Test Company',
                segment: 'Enterprise',
                plan_type: 'Premium',
                monthly_revenue: 5000,
                signup_date: '2023-01-01',
                last_login_date: '2024-01-01'
            };
            const mockHealthScore = { overallScore: 85, healthLevel: 'healthy' };
            const mockMetrics = { totalEvents: 100, totalTickets: 5 };

            mockCustomerService.getCustomerById.mockResolvedValue(mockCustomer);
            mockHealthCalculator.calculateHealthScore.mockResolvedValue(mockHealthScore);
            mockCustomerService.getCustomerMetrics.mockResolvedValue(mockMetrics);

            const response = await request(app)
                .get('/api/customers/1/health');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: {
                    customer: {
                        id: 1,
                        companyName: 'Test Company',
                        segment: 'Enterprise',
                        planType: 'Premium',
                        monthlyRevenue: 5000,
                        signupDate: '2023-01-01',
                        lastLoginDate: '2024-01-01'
                    },
                    healthScore: mockHealthScore,
                    metrics: mockMetrics
                }
            });
        });

        test('should return 404 when customer not found', async () => {
            mockCustomerService.getCustomerById.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/customers/999/health');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                error: 'Customer not found'
            });
        });
    });

    describe('getDashboardStats', () => {
        test('should return dashboard statistics', async () => {
            const mockStats = {
                total: 100,
                healthy: 60,
                atRisk: 25,
                critical: 15,
                averageHealthScore: 75.5
            };

            mockCustomerService.getDashboardStats.mockResolvedValue(mockStats);

            const response = await request(app)
                .get('/api/dashboard/stats');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: {
                    stats: mockStats,
                    averageHealthScore: 75.5
                }
            });
        });
    });

    describe('getHealthTrends', () => {
        test('should return health trends', async () => {
            const mockTrends = [
                { month: '2024-01', score: 75 },
                { month: '2024-02', score: 78 }
            ];

            mockCustomerService.getHealthTrends.mockResolvedValue(mockTrends);

            const response = await request(app)
                .get('/api/dashboard/trends');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: mockTrends
            });
        });
    });

    describe('getUsageTrends', () => {
        test('should return usage trends', async () => {
            const mockTrends = [
                { month: '2024-01', logins: 1000, apiCalls: 5000 }
            ];

            mockCustomerService.getUsageTrends.mockResolvedValue(mockTrends);

            const response = await request(app)
                .get('/api/dashboard/usage-trends');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: mockTrends
            });
        });
    });

    describe('getHealthComponentData', () => {
        test('should return health component data when customer exists', async () => {
            const mockCustomer = { id: 1, company_name: 'Test Company' };
            const mockData = [
                { id: 1, event_type: 'login', created_at: '2024-01-01' }
            ];

            mockCustomerService.getCustomerById.mockResolvedValue(mockCustomer);
            mockCustomerService.getHealthComponentData.mockResolvedValue(mockData);

            const response = await request(app)
                .get('/api/customers/1/health-data/login-events');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: {
                    customer: {
                        id: 1,
                        companyName: 'Test Company'
                    },
                    component: 'login-events',
                    data: mockData
                }
            });
        });

        test('should return 404 when customer not found', async () => {
            mockCustomerService.getCustomerById.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/customers/999/health-data/login-events');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                error: 'Customer not found'
            });
        });
    });

    describe('recordEvent', () => {
        test('should record event when customer exists', async () => {
            const mockCustomer = { id: 1, company_name: 'Test Company' };
            const mockEvent = { id: 123, eventType: 'login' };
            const mockHealthScore = { overallScore: 85, healthLevel: 'healthy' };
            const eventData = { eventType: 'login', eventData: { ip: '192.168.1.1' } };

            mockCustomerService.getCustomerById.mockResolvedValue(mockCustomer);
            mockCustomerService.recordEvent.mockResolvedValue(mockEvent);
            mockHealthCalculator.calculateHealthScore.mockResolvedValue(mockHealthScore);

            const response = await request(app)
                .post('/api/customers/1/events')
                .send(eventData);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                success: true,
                data: {
                    event: mockEvent,
                    updatedHealthScore: 85,
                    healthLevel: 'healthy'
                },
                message: 'Event recorded and health score updated'
            });
        });

        test('should return 404 when customer not found', async () => {
            mockCustomerService.getCustomerById.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/customers/999/events')
                .send({ eventType: 'login' });

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                error: 'Customer not found'
            });
        });
    });
});
