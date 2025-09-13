const CustomerService = require('../services/customerService');
const path = require('path');

// Mock the sqlite3 module
const mockDb = {
    get: jest.fn(),
    all: jest.fn(),
    prepare: jest.fn(() => {
        const mockStmt = {
            run: jest.fn((params, callback) => {
                if (callback) {
                    callback.call(mockStmt, null);
                }
            }),
            finalize: jest.fn(),
            lastID: 1
        };
        return mockStmt;
    }),
    close: jest.fn()
};

jest.mock('sqlite3', () => ({
    verbose: () => ({
        Database: jest.fn(() => mockDb)
    })
}));

describe('CustomerService - Unit Tests', () => {
    let customerService;

    beforeEach(() => {
        // Set the correct database path for tests
        process.env.DB_PATH = path.join(__dirname, '../../../database/customer_health.db');

        customerService = new CustomerService();
        // Mock the database connection
        customerService.db = mockDb;
        customerService.isInitialized = true;
        jest.clearAllMocks();

        // Reset mock implementations to default
        mockDb.get.mockReset();
        mockDb.all.mockReset();
        mockDb.prepare.mockReset();
    });

    afterEach(() => {
        if (customerService) {
            customerService.close();
        }
    });

    describe('getAllCustomers', () => {
        test('should return paginated customers with health scores', async () => {
            // Mock database responses
            mockDb.all.mockImplementation((query, params, callback) => {
                callback(null, [
                    {
                        id: 1,
                        company_name: 'Test Company 1',
                        overall_score: 85,
                        segment: 'Enterprise',
                        plan_type: 'Premium',
                        monthly_revenue: 5000,
                        signup_date: '2023-01-15',
                        last_login_date: '2024-01-15'
                    },
                    {
                        id: 2,
                        company_name: 'Test Company 2',
                        overall_score: 70,
                        segment: 'SMB',
                        plan_type: 'Basic',
                        monthly_revenue: 1000,
                        signup_date: '2023-06-01',
                        last_login_date: '2024-01-10'
                    }
                ]);
            });

            const result = await customerService.getAllCustomers({
                page: 1,
                limit: 20,
                segment: null,
                healthLevel: null,
                sortBy: 'overall_score',
                sortOrder: 'desc'
            });

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(2);
            expect(result[0]).toHaveProperty('id', 1);
            expect(result[0]).toHaveProperty('company_name', 'Test Company 1');
        });

        test('should filter by segment', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                callback(null, [
                    {
                        id: 1,
                        company_name: 'Test Company 1',
                        overall_score: 85,
                        segment: 'Enterprise'
                    }
                ]);
            });

            const result = await customerService.getAllCustomers({
                page: 1,
                limit: 20,
                segment: 'Enterprise',
                healthLevel: null,
                sortBy: 'overall_score',
                sortOrder: 'desc'
            });

            expect(result.length).toBe(1);
            expect(result[0].segment).toBe('Enterprise');
        });

        test('should filter by health level', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                callback(null, [
                    {
                        id: 1,
                        company_name: 'Test Company 1',
                        overall_score: 85,
                        segment: 'Enterprise'
                    }
                ]);
            });

            const result = await customerService.getAllCustomers({
                page: 1,
                limit: 20,
                segment: null,
                healthLevel: 'healthy',
                sortBy: 'overall_score',
                sortOrder: 'desc'
            });

            expect(result.length).toBe(1);
        });
    });

    describe('getCustomerById', () => {
        test('should return customer by id', async () => {
            mockDb.get.mockImplementation((query, params, callback) => {
                callback(null, {
                    id: 1,
                    company_name: 'Test Company 1',
                    overall_score: 85,
                    segment: 'Enterprise',
                    plan_type: 'Premium',
                    monthly_revenue: 5000,
                    signup_date: '2023-01-15',
                    last_login_date: '2024-01-15'
                });
            });

            const result = await customerService.getCustomerById(1);

            expect(result).toHaveProperty('id', 1);
            expect(result).toHaveProperty('company_name', 'Test Company 1');
            expect(result).toHaveProperty('overall_score', 85);
        });

        test('should return null for non-existent customer', async () => {
            mockDb.get.mockImplementation((query, params, callback) => {
                callback(null, null);
            });

            const result = await customerService.getCustomerById(999);

            expect(result).toBeNull();
        });
    });

    describe('getCustomerMetrics', () => {
        test('should return customer metrics', async () => {
            mockDb.get.mockImplementation((query, params, callback) => {
                callback(null, {
                    totalCustomers: 100,
                    healthyCustomers: 60,
                    atRiskCustomers: 25,
                    criticalCustomers: 15
                });
            });

            const result = await customerService.getCustomerMetrics(1);

            expect(result).toHaveProperty('totalEvents');
            expect(result).toHaveProperty('totalTickets');
            expect(result).toHaveProperty('totalPayments');
        });
    });

    describe('getTotalCustomerCount', () => {
        test('should return total customer count', async () => {
            mockDb.get.mockImplementation((query, callback) => {
                if (callback) {
                    callback(null, { count: 100 });
                }
            });

            const result = await customerService.getTotalCustomerCount();

            expect(result).toBe(100);
            expect(mockDb.get).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM customers', expect.any(Function));
        });
    });

    describe('recordEvent', () => {
        test('should record customer event', async () => {
            const mockStmt = {
                run: jest.fn((params, callback) => {
                    callback.call(mockStmt, null);
                }),
                finalize: jest.fn(),
                lastID: 123
            };
            mockDb.prepare.mockReturnValue(mockStmt);

            const eventData = {
                eventType: 'login',
                eventData: { ip: '192.168.1.1' }
            };

            const result = await customerService.recordEvent(1, eventData);

            expect(mockDb.prepare).toHaveBeenCalled();
            expect(result).toHaveProperty('id', 123);
            expect(result).toHaveProperty('eventType', 'login');
        });
    });

    describe('getDashboardStats', () => {
        test('should return dashboard statistics', async () => {
            // Mock the complex getDashboardStats method with multiple database calls
            mockDb.get
                .mockImplementationOnce((query, callback) => {
                    // First call - total customers
                    if (callback) {
                        callback(null, { total: 100 });
                    }
                })
                .mockImplementationOnce((query, callback) => {
                    // Third call - average health score
                    if (callback) {
                        callback(null, { avg_score: 75.5 });
                    }
                });

            mockDb.all.mockImplementation((query, callback) => {
                // Second call - health level distribution
                if (callback) {
                    callback(null, [
                        { health_level: 'healthy', count: 60 },
                        { health_level: 'at-risk', count: 25 },
                        { health_level: 'critical', count: 15 },
                        { health_level: 'churned', count: 0 }
                    ]);
                }
            });

            const result = await customerService.getDashboardStats();

            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('averageHealthScore');
            expect(result).toHaveProperty('healthy');
            expect(result).toHaveProperty('atRisk');
            expect(result).toHaveProperty('critical');
        });
    });

    describe('getHealthTrends', () => {
        test('should return health trends', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                callback(null, [
                    { month: '2024-01', averageScore: 75 },
                    { month: '2024-02', averageScore: 78 }
                ]);
            });

            const result = await customerService.getHealthTrends(6);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(2);
        });
    });

    describe('getUsageTrends', () => {
        test('should return usage trends', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                callback(null, [
                    { month: '2024-01', totalLogins: 1000, totalApiCalls: 5000 },
                    { month: '2024-02', totalLogins: 1200, totalApiCalls: 6000 }
                ]);
            });

            const result = await customerService.getUsageTrends(6);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(2);
        });
    });

    describe('getHealthComponentData', () => {
        test('should return health component data', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                callback(null, [
                    { id: 1, event_type: 'login', created_at: '2024-01-01' },
                    { id: 2, event_type: 'login', created_at: '2024-01-02' }
                ]);
            });

            const result = await customerService.getHealthComponentData(1, 'login-events');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(2);
        });
    });

    describe('error handling', () => {
        test('should handle database errors in getAllCustomers', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(new Error('Database error'), null);
                }
            });

            await expect(customerService.getAllCustomers({
                page: 1,
                limit: 20
            })).rejects.toThrow('Database error');
        });

        test('should handle database errors in getCustomerById', async () => {
            mockDb.get.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(new Error('Database error'), null);
                }
            });

            await expect(customerService.getCustomerById(1))
                .rejects.toThrow('Database error');
        });

        test('should handle database errors in recordEvent', async () => {
            const mockStmt = {
                run: jest.fn((params, callback) => {
                    if (callback) {
                        callback.call(mockStmt, new Error('Insert failed'));
                    }
                }),
                finalize: jest.fn()
            };
            mockDb.prepare.mockReturnValue(mockStmt);

            await expect(customerService.recordEvent(1, { eventType: 'login' }))
                .rejects.toThrow('Insert failed');
        });
    });
});
