const request = require('supertest');

// Mock the database services to avoid actual database calls
jest.mock('../services/customerService', () => {
    return jest.fn().mockImplementation(() => ({
        getAllCustomers: jest.fn().mockResolvedValue({
            data: [
                {
                    id: 1,
                    company_name: 'Test Company 1',
                    overall_score: 85,
                    segment: 'Enterprise'
                }
            ],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
        }),
        getCustomerById: jest.fn().mockImplementation((customerId) => {
            if (customerId === 99999) {
                return Promise.resolve(null);
            }
            return Promise.resolve({
                id: 1,
                company_name: 'Test Company 1',
                overall_score: 85,
                segment: 'Enterprise'
            });
        }),
        getCustomerMetrics: jest.fn().mockResolvedValue({
            totalCustomers: 1,
            healthyCustomers: 1,
            atRiskCustomers: 0,
            criticalCustomers: 0
        }),
        getTotalCustomerCount: jest.fn().mockResolvedValue(1),
        recordEvent: jest.fn().mockResolvedValue({ success: true })
    }));
});

jest.mock('../services/healthScoreCalculator', () => {
    return jest.fn().mockImplementation(() => ({
        calculateHealthScore: jest.fn().mockImplementation((customerId) => {
            if (customerId === 99999) {
                return Promise.reject(new Error('Customer not found'));
            }
            return Promise.resolve({
                customerId: 1,
                overallScore: 85,
                healthLevel: 'healthy',
                breakdown: {
                    loginFrequency: { score: 80, weight: 0.25, weightedScore: 20 },
                    featureAdoption: { score: 90, weight: 0.20, weightedScore: 18 },
                    supportTickets: { score: 100, weight: 0.15, weightedScore: 15 },
                    paymentTimeliness: { score: 85, weight: 0.25, weightedScore: 21.25 },
                    apiUsage: { score: 70, weight: 0.15, weightedScore: 10.5 }
                },
                calculatedAt: new Date().toISOString()
            });
        })
    }));
});

// Import app after mocking
const app = require('../index');

describe('Customer Health API - Integration Tests', () => {
    describe('GET /api/health', () => {
        test('should return health status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe('healthy');
        });
    });

    describe('GET /api/customers', () => {
        test('should return list of customers with health scores', async () => {
            const response = await request(app)
                .get('/api/customers')
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('pagination');

            // The data is nested: response.body.data.data
            const customersData = response.body.data.data;
            expect(Array.isArray(customersData)).toBe(true);
            expect(customersData.length).toBeGreaterThan(0);

            // Check first customer has required fields
            const firstCustomer = customersData[0];
            expect(firstCustomer).toHaveProperty('id');
            expect(firstCustomer).toHaveProperty('company_name');
            expect(firstCustomer).toHaveProperty('overall_score');
            expect(firstCustomer).toHaveProperty('segment');
        });
    });

    describe('GET /api/customers/:id/health', () => {
        test('should return detailed health breakdown for specific customer', async () => {
            const response = await request(app)
                .get('/api/customers/1/health')
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('success');

            const data = response.body.data;
            expect(data).toHaveProperty('customer');
            expect(data).toHaveProperty('healthScore');
            expect(data).toHaveProperty('metrics');

            // Check health score breakdown
            const healthScore = data.healthScore;
            expect(healthScore).toHaveProperty('customerId');
            expect(healthScore).toHaveProperty('overallScore');
            expect(healthScore).toHaveProperty('healthLevel');
            expect(healthScore).toHaveProperty('breakdown');

            // Check breakdown has all factors
            const breakdown = healthScore.breakdown;
            expect(breakdown).toHaveProperty('loginFrequency');
            expect(breakdown).toHaveProperty('featureAdoption');
            expect(breakdown).toHaveProperty('supportTickets');
            expect(breakdown).toHaveProperty('paymentTimeliness');
            expect(breakdown).toHaveProperty('apiUsage');
        });

        test('should return 404 for non-existent customer', async () => {
            const response = await request(app)
                .get('/api/customers/99999/health')
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/customers/:id/events', () => {
        test('should record customer activity event', async () => {
            const eventData = {
                eventType: 'login',
                eventData: {
                    ip: '192.168.1.1',
                    userAgent: 'Mozilla/5.0'
                }
            };

            const response = await request(app)
                .post('/api/customers/1/events')
                .send(eventData)
                .expect(201);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toContain('Event recorded');
        });

        test('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/customers/1/events')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/dashboard', () => {
        test('should return 404 for missing dashboard file', async () => {
            const response = await request(app)
                .get('/api/dashboard')
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });
    });
});