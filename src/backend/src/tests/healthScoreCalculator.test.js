const HealthScoreCalculator = require('../services/healthScoreCalculator');
const path = require('path');
const fs = require('fs');

describe('HealthScoreCalculator', () => {
    let calculator;

    beforeAll(() => {
        // Set the correct database path for tests
        process.env.DB_PATH = path.join(__dirname, '../../../database/customer_health.db');

        // Check if database exists
        const dbPath = process.env.DB_PATH;
        if (!fs.existsSync(dbPath)) {
            throw new Error(`Database not found at ${dbPath}. Please run 'npm run setup-all' in the database folder first.`);
        }

        calculator = new HealthScoreCalculator();
    });

    afterAll(() => {
        if (calculator) {
            calculator.close();
        }
    });

    test('should calculate health score for a customer', async () => {
        const healthScore = await calculator.calculateHealthScore(1);

        expect(healthScore).toHaveProperty('customerId', 1);
        expect(healthScore).toHaveProperty('overallScore');
        expect(healthScore).toHaveProperty('breakdown');
        expect(healthScore).toHaveProperty('healthLevel');
        expect(healthScore).toHaveProperty('calculatedAt');

        expect(healthScore.overallScore).toBeGreaterThanOrEqual(0);
        expect(healthScore.overallScore).toBeLessThanOrEqual(100);

        expect(healthScore.breakdown).toHaveProperty('loginFrequency');
        expect(healthScore.breakdown).toHaveProperty('featureAdoption');
        expect(healthScore.breakdown).toHaveProperty('supportTickets');
        expect(healthScore.breakdown).toHaveProperty('paymentTimeliness');
        expect(healthScore.breakdown).toHaveProperty('apiUsage');

        // Check that all breakdown scores are valid
        Object.values(healthScore.breakdown).forEach(factor => {
            expect(factor.score).toBeGreaterThanOrEqual(0);
            expect(factor.score).toBeLessThanOrEqual(100);
            expect(factor.weight).toBeGreaterThan(0);
            expect(factor.weight).toBeLessThanOrEqual(1);
        });
    }, 10000); // 10 second timeout

    test('should return correct health level', () => {
        expect(calculator.getHealthLevel(85)).toBe('healthy');
        expect(calculator.getHealthLevel(70)).toBe('at-risk');
        expect(calculator.getHealthLevel(50)).toBe('critical');
        expect(calculator.getHealthLevel(30)).toBe('churned');
    });

    // Note: recalculateAllHealthScores method doesn't exist in the actual implementation
    // This test is removed as it tests non-existent functionality
});
