const HealthScoreCalculator = require('../services/healthScoreCalculator');

// Mock the sqlite3 module
const mockDb = {
    get: jest.fn(),
    all: jest.fn(),
    prepare: jest.fn(() => {
        const mockStmt = {
            run: jest.fn((params, callback) => {
                if (callback) {
                    // Call the callback with the correct context (this = mockStmt)
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

describe('HealthScoreCalculator - Unit Tests', () => {
    let calculator;

    beforeEach(() => {
        calculator = new HealthScoreCalculator();
        // Mock the database connection
        calculator.db = mockDb;
        calculator.isInitialized = true;
        jest.clearAllMocks();
    });

    describe('getHealthLevel', () => {
        test('should return correct health level for different scores', () => {
            expect(calculator.getHealthLevel(95)).toBe('healthy');
            expect(calculator.getHealthLevel(85)).toBe('healthy');
            expect(calculator.getHealthLevel(80)).toBe('healthy');

            expect(calculator.getHealthLevel(79)).toBe('at-risk');
            expect(calculator.getHealthLevel(70)).toBe('at-risk');
            expect(calculator.getHealthLevel(60)).toBe('at-risk');

            expect(calculator.getHealthLevel(59)).toBe('critical');
            expect(calculator.getHealthLevel(50)).toBe('critical');
            expect(calculator.getHealthLevel(40)).toBe('critical');

            expect(calculator.getHealthLevel(39)).toBe('churned');
            expect(calculator.getHealthLevel(20)).toBe('churned');
            expect(calculator.getHealthLevel(0)).toBe('churned');
        });
    });

    describe('calculateHealthScore', () => {
        test('should calculate health score for active customer', async () => {
            // Mock database responses for all queries
            mockDb.get
                .mockImplementationOnce((query, params, callback) => {
                    // loginEvents query
                    callback(null, { activeDays: 20 });
                })
                .mockImplementationOnce((query, params, callback) => {
                    // featureUsage query
                    callback(null, { usedFeatures: 10 });
                })
                .mockImplementationOnce((query, params, callback) => {
                    // supportTickets query
                    callback(null, { totalTickets: 2, highPriorityTickets: 0 });
                })
                .mockImplementationOnce((query, params, callback) => {
                    // payments query
                    callback(null, { totalPayments: 6, onTimePayments: 6, overduePayments: 0 });
                })
                .mockImplementationOnce((query, params, callback) => {
                    // apiUsage query
                    callback(null, { totalRequests: 1000, activeDays: 15 });
                });

            const result = await calculator.calculateHealthScore(1);

            expect(result).toHaveProperty('customerId', 1);
            expect(result).toHaveProperty('overallScore');
            expect(result).toHaveProperty('breakdown');
            expect(result).toHaveProperty('healthLevel');
            expect(result).toHaveProperty('calculatedAt');

            expect(result.overallScore).toBeGreaterThanOrEqual(0);
            expect(result.overallScore).toBeLessThanOrEqual(100);

            expect(result.breakdown).toHaveProperty('loginFrequency');
            expect(result.breakdown).toHaveProperty('featureAdoption');
            expect(result.breakdown).toHaveProperty('supportTickets');
            expect(result.breakdown).toHaveProperty('paymentTimeliness');
            expect(result.breakdown).toHaveProperty('apiUsage');
        }, 15000);

        test('should handle customer with no activity', async () => {
            // Mock database responses for customer with no activity
            mockDb.get
                .mockImplementationOnce((query, params, callback) => {
                    callback(null, { activeDays: 0 });
                })
                .mockImplementationOnce((query, params, callback) => {
                    callback(null, { usedFeatures: 0 });
                })
                .mockImplementationOnce((query, params, callback) => {
                    callback(null, { totalTickets: 0, highPriorityTickets: 0 });
                })
                .mockImplementationOnce((query, params, callback) => {
                    callback(null, { totalPayments: 0, onTimePayments: 0, overduePayments: 0 });
                })
                .mockImplementationOnce((query, params, callback) => {
                    callback(null, { totalRequests: 0, activeDays: 0 });
                });

            const result = await calculator.calculateHealthScore(1);

            expect(result.customerId).toBe(1);
            expect(result.overallScore).toBe(40); // Support (100) + Payment (100) = 40 overall
            expect(result.healthLevel).toBe('critical');
        }, 15000);

        test('should handle database errors', async () => {
            mockDb.get.mockImplementation((query, params, callback) => {
                callback(new Error('Database error'), null);
            });

            await expect(calculator.calculateHealthScore(1))
                .rejects.toThrow('Database error');
        }, 15000);
    });

    describe('updateHealthScore', () => {
        test('should update health score in database', async () => {
            const healthScore = {
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
            };

            const result = await calculator.updateHealthScore(1, healthScore);

            expect(mockDb.prepare).toHaveBeenCalled();
            expect(result).toBe(1);
        }, 15000);

        test('should handle database errors during update', async () => {
            const mockStmt = {
                run: jest.fn((params, callback) => callback(new Error('Update failed'))),
                finalize: jest.fn()
            };
            mockDb.prepare.mockReturnValue(mockStmt);

            const healthScore = {
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
            };

            await expect(calculator.updateHealthScore(1, healthScore))
                .rejects.toThrow('Update failed');
        }, 15000);
    });
});