const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Helper function
function getHealthLevel(score) {
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'at-risk';
    if (score >= 40) return 'critical';
    return 'churned';
}

class HealthScoreCalculator {
    constructor() {
        this.dbPath = process.env.DB_PATH || '/app/data/customer_health.db';
        console.log('HealthScoreCalculator Database path:', this.dbPath);
        this.db = null;
        this.isInitialized = false;
        // Don't call initializeDatabase in constructor
    }

    async initializeDatabase() {
        if (this.isInitialized) {
            return this.db !== null;
        }

        return new Promise((resolve, reject) => {
            // Check if database file exists
            const fs = require('fs');
            if (!fs.existsSync(this.dbPath)) {
                console.warn(`HealthScoreCalculator Database file not found at: ${this.dbPath}`);
            }

            this.db = new sqlite3.Database(this.dbPath, (err) => {
                this.isInitialized = true;
                if (err) {
                    console.error('HealthScoreCalculator Error opening database:', err);
                    this.db = null;
                    reject(err);
                } else {
                    console.log('HealthScoreCalculator Connected to SQLite database');
                    resolve(true);
                }
            });
        });
    }

    async ensureDatabaseConnection() {
        if (!this.isInitialized || !this.db) {
            await this.initializeDatabase();
        }
        if (!this.db) {
            throw new Error('Database connection failed');
        }
        return true;
    }

    /**
     * Calculate health score for a customer
     */
    async calculateHealthScore(customerId) {
        await this.ensureDatabaseConnection();

        return new Promise((resolve, reject) => {
            // Get all the data we need for health calculation
            const queries = {
                loginEvents: `SELECT COUNT(DISTINCT DATE(created_at)) as activeDays 
                             FROM customer_events 
                             WHERE customer_id = ? AND event_type = 'login' 
                             AND created_at >= datetime('now', '-30 days')`,

                featureUsage: `SELECT COUNT(DISTINCT feature_name) as usedFeatures
                              FROM feature_usage 
                              WHERE customer_id = ?`,

                supportTickets: `SELECT COUNT(*) as totalTickets,
                                COUNT(CASE WHEN priority = 'high' OR priority = 'critical' THEN 1 END) as highPriorityTickets
                                FROM support_tickets 
                                WHERE customer_id = ? 
                                AND created_at >= datetime('now', '-90 days')`,

                payments: `SELECT COUNT(*) as totalPayments,
                          COUNT(CASE WHEN status = 'paid' AND paid_date <= due_date THEN 1 END) as onTimePayments,
                          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overduePayments
                          FROM payments 
                          WHERE customer_id = ? 
                          AND due_date >= date('now', '-6 months')`,

                apiUsage: `SELECT COALESCE(SUM(request_count), 0) as totalRequests,
                          COUNT(DISTINCT date) as activeDays
                          FROM api_usage 
                          WHERE customer_id = ? 
                          AND date >= date('now', '-30 days')`
            };

            let completed = 0;
            const results = {};
            const total = Object.keys(queries).length;

            Object.entries(queries).forEach(([key, query]) => {
                this.db.get(query, [customerId], (err, row) => {
                    if (err) {
                        console.error(`HealthScoreCalculator Error in query ${key}:`, err);
                        reject(err);
                        return;
                    }

                    // Handle null results (no data found) with proper defaults
                    results[key] = {
                        activeDays: row?.activeDays || 0,
                        usedFeatures: row?.usedFeatures || 0,
                        totalTickets: row?.totalTickets || 0,
                        highPriorityTickets: row?.highPriorityTickets || 0,
                        totalPayments: row?.totalPayments || 0,
                        onTimePayments: row?.onTimePayments || 0,
                        overduePayments: row?.overduePayments || 0,
                        totalRequests: row?.totalRequests || 0
                    };

                    console.log(`HealthScoreCalculator Query ${key} for customer ${customerId}:`, results[key]);

                    completed++;

                    if (completed === total) {
                        console.log('HealthScoreCalculator All query results for customer', customerId, ':', results);

                        // Calculate scores with null checks
                        const loginScore = Math.min((results.loginEvents.activeDays || 0) * 5, 100);
                        const featureScore = Math.min(((results.featureUsage.usedFeatures || 0) / 15) * 100, 100);

                        let supportScore = 100;
                        const totalTickets = results.supportTickets.totalTickets || 0;
                        const highPriorityTickets = results.supportTickets.highPriorityTickets || 0;

                        if (totalTickets > 10) supportScore -= 30;
                        else if (totalTickets > 5) supportScore -= 20;
                        else if (totalTickets > 2) supportScore -= 10;

                        if (highPriorityTickets > 3) supportScore -= 25;
                        else if (highPriorityTickets > 1) supportScore -= 15;
                        else if (highPriorityTickets > 0) supportScore -= 5;

                        supportScore = Math.max(supportScore, 0);

                        let paymentScore = 100;
                        const totalPayments = results.payments.totalPayments || 0;
                        const onTimePayments = results.payments.onTimePayments || 0;
                        const overduePayments = results.payments.overduePayments || 0;

                        if (totalPayments > 0) {
                            const onTimeRate = (onTimePayments / totalPayments) * 100;
                            paymentScore = onTimeRate - (overduePayments * 5);
                            paymentScore = Math.max(paymentScore, 0);
                        }

                        let apiScore = 0;
                        const totalRequests = results.apiUsage.totalRequests || 0;
                        const activeDays = results.apiUsage.activeDays || 0;

                        if (totalRequests > 0) {
                            if (totalRequests >= 5000) apiScore = 100;
                            else if (totalRequests >= 2500) apiScore = 80;
                            else if (totalRequests >= 1000) apiScore = 60;
                            else if (totalRequests >= 500) apiScore = 40;
                            else if (totalRequests >= 100) apiScore = 20;
                            else apiScore = 10;

                            if (activeDays >= 25) apiScore += 10;
                            else if (activeDays >= 15) apiScore += 5;

                            apiScore = Math.min(apiScore, 100);
                        }

                        const overallScore = Math.round(
                            (loginScore * 0.25) +
                            (featureScore * 0.20) +
                            (supportScore * 0.15) +
                            (paymentScore * 0.25) +
                            (apiScore * 0.15)
                        );

                        console.log(`HealthScoreCalculator Health score calculation for customer ${customerId}:`, {
                            loginScore,
                            featureScore,
                            supportScore,
                            paymentScore,
                            apiScore,
                            overallScore
                        });

                        const healthScore = {
                            customerId,
                            overallScore,
                            breakdown: {
                                loginFrequency: { score: Math.round(loginScore), weight: 0.25 },
                                featureAdoption: { score: Math.round(featureScore), weight: 0.20 },
                                supportTickets: { score: Math.round(supportScore), weight: 0.15 },
                                paymentTimeliness: { score: Math.round(paymentScore), weight: 0.25 },
                                apiUsage: { score: Math.round(apiScore), weight: 0.15 }
                            },
                            healthLevel: getHealthLevel(overallScore),
                            calculatedAt: new Date().toISOString()
                        };

                        // Store the health score in the database
                        this.updateHealthScore(customerId, healthScore)
                            .then(() => resolve(healthScore))
                            .catch(err => {
                                console.error('HealthScoreCalculator Error storing health score:', err);
                                resolve(healthScore); // Still return the calculated score even if storage fails
                            });
                    }
                });
            });
        });
    }

    /**
     * Update health score in the database
     */
    async updateHealthScore(customerId, healthScore) {
        await this.ensureDatabaseConnection();

        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO health_scores (
                    customer_id, overall_score, login_frequency_score, 
                    feature_adoption_score, support_ticket_score, 
                    payment_timeliness_score, api_usage_score, calculated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run([
                customerId,
                healthScore.overallScore,
                healthScore.breakdown.loginFrequency.score,
                healthScore.breakdown.featureAdoption.score,
                healthScore.breakdown.supportTickets.score,
                healthScore.breakdown.paymentTimeliness.score,
                healthScore.breakdown.apiUsage.score,
                healthScore.calculatedAt
            ], function (err) {
                if (err) {
                    console.error('HealthScoreCalculator Error storing health score:', err);
                    reject(err);
                    return;
                }

                console.log(`HealthScoreCalculator Stored health score for customer ${customerId}: ${healthScore.overallScore}`);
                resolve(this.lastID);
            });

            stmt.finalize();
        });
    }

    /**
     * Get health level from score
     */
    getHealthLevel(score) {
        return getHealthLevel(score);
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = HealthScoreCalculator;