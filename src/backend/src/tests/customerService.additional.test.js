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

describe('CustomerService - Additional Tests for Coverage', () => {
    let customerService;

    beforeEach(() => {
        process.env.DB_PATH = path.join(__dirname, '../../../database/customer_health.db');
        customerService = new CustomerService();
        customerService.db = mockDb;
        customerService.isInitialized = true;
        jest.clearAllMocks();
    });

    afterEach(() => {
        if (customerService) {
            customerService.close();
        }
    });

    describe('getHealthComponentData - All Components', () => {
        test('should handle login-events component', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, [
                        { id: 1, event_type: 'login', created_at: '2024-01-01' }
                    ]);
                }
            });

            const result = await customerService.getHealthComponentData(1, 'login-events');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(1);
        });

        test('should handle feature-usage component', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, [
                        { id: 1, feature_name: 'dashboard', usage_count: 10 }
                    ]);
                }
            });

            const result = await customerService.getHealthComponentData(1, 'feature-usage');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(1);
        });

        test('should handle support-tickets component', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, [
                        { id: 1, ticket_id: 'TICKET-001', priority: 'high' }
                    ]);
                }
            });

            const result = await customerService.getHealthComponentData(1, 'support-tickets');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(1);
        });

        test('should handle payments component', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, [
                        { id: 1, invoice_id: 'INV-001', amount: 1000 }
                    ]);
                }
            });

            const result = await customerService.getHealthComponentData(1, 'payments');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(1);
        });

        test('should handle api-usage component', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, [
                        { id: 1, endpoint: '/api/customers', request_count: 100 }
                    ]);
                }
            });

            const result = await customerService.getHealthComponentData(1, 'api-usage');

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(1);
        });

        test('should reject for invalid component', async () => {
            await expect(customerService.getHealthComponentData(1, 'invalid-component'))
                .rejects.toThrow('Invalid health component: invalid-component');
        });

        test('should handle database errors in getHealthComponentData', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(new Error('Database error'), null);
                }
            });

            await expect(customerService.getHealthComponentData(1, 'login-events'))
                .rejects.toThrow('Database error');
        });
    });

    describe('getHealthComponentData - Data Formatting', () => {
        test('should format dates correctly', async () => {
            const mockData = [
                {
                    id: 1,
                    created_at: '2024-01-01T10:00:00Z',
                    updated_at: '2024-01-02T10:00:00Z',
                    last_used: '2024-01-03T10:00:00Z',
                    resolved_at: '2024-01-04T10:00:00Z',
                    due_date: '2024-01-05T10:00:00Z',
                    paid_date: '2024-01-06T10:00:00Z',
                    date: '2024-01-07T10:00:00Z',
                    amount: 1000.50,
                    event_data: '{"ip": "192.168.1.1"}'
                }
            ];

            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, mockData);
                }
            });

            const result = await customerService.getHealthComponentData(1, 'feature-usage');

            expect(result[0].created_at).toContain('2024');
            expect(result[0].updated_at).toContain('2024');
            expect(result[0].last_used).toContain('2024');
            expect(result[0].resolved_at).toContain('2024');
            expect(result[0].due_date).toContain('2024');
            expect(result[0].paid_date).toContain('2024');
            expect(result[0].date).toContain('2024');
            expect(result[0].amount).toBe('$1000.50');
            expect(result[0].event_data).toEqual({ ip: '192.168.1.1' });
        });

        test('should handle invalid JSON in event_data', async () => {
            const mockData = [
                {
                    id: 1,
                    event_data: 'invalid json'
                }
            ];

            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, mockData);
                }
            });

            const result = await customerService.getHealthComponentData(1, 'login-events');

            expect(result[0].event_data).toBe('invalid json');
        });
    });

    describe('getAllCustomers - Edge Cases', () => {
        test('should handle empty results', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, []);
                }
            });

            const result = await customerService.getAllCustomers({
                page: 1,
                limit: 20
            });

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });

        test('should handle customers with null health scores', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, [
                        {
                            id: 1,
                            company_name: 'Test Company',
                            overall_score: null,
                            segment: 'Enterprise'
                        }
                    ]);
                }
            });

            const result = await customerService.getAllCustomers({
                page: 1,
                limit: 20
            });

            expect(result[0].overall_score || 0).toBe(0);
            expect(result[0].healthLevel).toBe('churned');
        });

        test('should handle different health levels', async () => {
            const testCases = [
                { score: 90, expectedLevel: 'healthy' },
                { score: 70, expectedLevel: 'at-risk' },
                { score: 50, expectedLevel: 'critical' },
                { score: 30, expectedLevel: 'churned' }
            ];

            for (const testCase of testCases) {
                mockDb.all.mockImplementation((query, params, callback) => {
                    if (callback) {
                        callback(null, [
                            {
                                id: 1,
                                company_name: 'Test Company',
                                overall_score: testCase.score
                            }
                        ]);
                    }
                });

                const result = await customerService.getAllCustomers({
                    page: 1,
                    limit: 20
                });

                expect(result[0].healthLevel).toBe(testCase.expectedLevel);
            }
        });
    });

    describe('getDashboardStats - Edge Cases', () => {
        test('should handle empty health level distribution', async () => {
            mockDb.get
                .mockImplementationOnce((query, callback) => {
                    if (callback) {
                        callback(null, { total: 100 });
                    }
                })
                .mockImplementationOnce((query, callback) => {
                    if (callback) {
                        callback(null, { avg_score: 75.5 });
                    }
                });

            mockDb.all.mockImplementation((query, callback) => {
                if (callback) {
                    callback(null, []);
                }
            });

            const result = await customerService.getDashboardStats();

            expect(result).toEqual({
                total: 100,
                healthy: 0,
                atRisk: 0,
                critical: 0,
                churned: 0,
                averageHealthScore: 75.5
            });
        });

        test('should handle null average health score', async () => {
            mockDb.get
                .mockImplementationOnce((query, callback) => {
                    if (callback) {
                        callback(null, { total: 100 });
                    }
                })
                .mockImplementationOnce((query, callback) => {
                    if (callback) {
                        callback(null, { avg_score: null });
                    }
                });

            mockDb.all.mockImplementation((query, callback) => {
                if (callback) {
                    callback(null, []);
                }
            });

            const result = await customerService.getDashboardStats();

            expect(result.averageHealthScore).toBe(0);
        });
    });

    describe('getHealthTrends - Edge Cases', () => {
        test('should handle empty trends data', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, []);
                }
            });

            const result = await customerService.getHealthTrends(6);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });

        test('should handle null average scores', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, [
                        { month: '2024-01', avgScore: null, customerCount: 0 }
                    ]);
                }
            });

            const result = await customerService.getHealthTrends(6);

            expect(result[0].score).toBe(0);
        });
    });

    describe('getUsageTrends - Edge Cases', () => {
        test('should handle empty usage trends data', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, []);
                }
            });

            const result = await customerService.getUsageTrends(6);

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });

        test('should handle null values in trends', async () => {
            mockDb.all.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, [
                        { month: '2024-01', logins: null, apiCalls: null }
                    ]);
                }
            });

            const result = await customerService.getUsageTrends(6);

            expect(result[0].logins).toBe(0);
            expect(result[0].apiCalls).toBe(0);
        });
    });

    describe('getCustomerMetrics - Edge Cases', () => {
        test('should handle null count values', async () => {
            mockDb.get.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(null, { count: null });
                }
            });

            const result = await customerService.getCustomerMetrics(1);

            expect(result.totalEvents).toBe(0);
            expect(result.recentEvents).toBe(0);
            expect(result.totalTickets).toBe(0);
            expect(result.openTickets).toBe(0);
            expect(result.totalPayments).toBe(0);
            expect(result.overduePayments).toBe(0);
            expect(result.featuresUsed).toBe(0);
            expect(result.apiRequests).toBe(0);
        });

        test('should handle database errors in getCustomerMetrics', async () => {
            mockDb.get.mockImplementation((query, params, callback) => {
                if (callback) {
                    callback(new Error('Database error'), null);
                }
            });

            await expect(customerService.getCustomerMetrics(1))
                .rejects.toThrow('Database error');
        });
    });

    describe('recordEvent - Edge Cases', () => {
        test('should handle event data without eventData property', async () => {
            const mockStmt = {
                run: jest.fn((params, callback) => {
                    if (callback) {
                        callback.call(mockStmt, null);
                    }
                }),
                finalize: jest.fn(),
                lastID: 123
            };
            mockDb.prepare.mockReturnValue(mockStmt);

            const eventData = { eventType: 'login' };

            const result = await customerService.recordEvent(1, eventData);

            expect(result).toHaveProperty('id', 123);
            expect(result).toHaveProperty('eventType', 'login');
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
