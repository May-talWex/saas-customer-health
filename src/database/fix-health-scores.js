const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || '/app/data/customer_health.db';

async function fixHealthScores() {
    return new Promise((resolve, reject) => {
        console.log('�� Fixing health scores in database...');
        console.log('Database path:', dbPath);

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Error opening database:', err);
                reject(err);
                return;
            }
            console.log('✅ Connected to SQLite database');
        });

        // First, check how many customers exist
        db.get('SELECT COUNT(*) as count FROM customers', (err, row) => {
            if (err) {
                console.error('Error counting customers:', err);
                reject(err);
                return;
            }
            console.log(`Found ${row.count} customers in database`);

            // Check how many health scores exist
            db.get('SELECT COUNT(*) as count FROM health_scores', (err, healthRow) => {
                if (err) {
                    console.error('Error counting health scores:', err);
                    reject(err);
                    return;
                }
                console.log(`Found ${healthRow.count} health scores in database`);

                // Get all customer IDs
                db.all('SELECT id FROM customers ORDER BY id', (err, customers) => {
                    if (err) {
                        console.error('Error getting customers:', err);
                        reject(err);
                        return;
                    }

                    console.log(`Generating health scores for ${customers.length} customers...`);

                    let completed = 0;
                    const total = customers.length;

                    customers.forEach(customer => {
                        calculateHealthScore(db, customer.id).then(healthScore => {
                            const stmt = db.prepare(`
                                INSERT OR REPLACE INTO health_scores 
                                (customer_id, overall_score, login_frequency_score, feature_adoption_score, support_ticket_score, payment_timeliness_score, api_usage_score, calculated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            `);

                            stmt.run([
                                customer.id,
                                healthScore.overallScore,
                                healthScore.loginScore,
                                healthScore.featureScore,
                                healthScore.supportScore,
                                healthScore.paymentScore,
                                healthScore.apiScore,
                                new Date().toISOString()
                            ], function (err) {
                                if (err) {
                                    console.error(`Error inserting health score for customer ${customer.id}:`, err);
                                } else {
                                    console.log(`✅ Health score for customer ${customer.id}: ${healthScore.overallScore}`);
                                }
                                completed++;

                                if (completed === total) {
                                    stmt.finalize();
                                    console.log('🎉 All health scores have been generated!');
                                    db.close();
                                    resolve();
                                }
                            });
                        }).catch(err => {
                            console.error(`Error calculating health score for customer ${customer.id}:`, err);
                            completed++;
                            if (completed === total) {
                                db.close();
                                resolve();
                            }
                        });
                    });
                });
            });
        });
    });
}

function calculateHealthScore(db, customerId) {
    return new Promise((resolve, reject) => {
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

            apiUsage: `SELECT SUM(request_count) as totalRequests,
                      COUNT(DISTINCT date) as activeDays
                      FROM api_usage 
                      WHERE customer_id = ? 
                      AND date >= date('now', '-30 days')`
        };

        let completed = 0;
        const results = {};
        const total = Object.keys(queries).length;

        Object.entries(queries).forEach(([key, query]) => {
            db.get(query, [customerId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                results[key] = row || { activeDays: 0, usedFeatures: 0, totalTickets: 0, highPriorityTickets: 0, totalPayments: 0, onTimePayments: 0, overduePayments: 0, totalRequests: 0 };
                completed++;

                if (completed === total) {
                    // Calculate scores
                    const loginScore = Math.min((results.loginEvents.activeDays || 0) * 6, 100);
                    const featureScore = Math.min(((results.featureUsage.usedFeatures || 0) / 10) * 100, 100);

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
                        const paidPayments = totalPayments - overduePayments;
                        const onTimeRate = (paidPayments / totalPayments) * 100;
                        paymentScore = onTimeRate - (overduePayments * 10);
                        paymentScore = Math.max(paymentScore, 0);
                    }

                    let apiScore = 0;
                    const totalRequests = results.apiUsage.totalRequests || 0;
                    const activeDays = results.apiUsage.activeDays || 0;

                    if (totalRequests > 0) {
                        if (totalRequests >= 500) apiScore = 100;
                        else if (totalRequests >= 200) apiScore = 80;
                        else if (totalRequests >= 100) apiScore = 60;
                        else if (totalRequests >= 50) apiScore = 40;
                        else if (totalRequests >= 20) apiScore = 20;
                        else apiScore = Math.min((totalRequests / 20) * 20, 20);

                        if (activeDays >= 20) apiScore += 10;
                        else if (activeDays >= 10) apiScore += 5;
                        else if (activeDays >= 5) apiScore += 2;

                        apiScore = Math.min(apiScore, 100);
                    }

                    const overallScore = Math.round(
                        (loginScore * 0.25) +
                        (featureScore * 0.20) +
                        (supportScore * 0.15) +
                        (paymentScore * 0.25) +
                        (apiScore * 0.15)
                    );

                    resolve({
                        overallScore,
                        loginScore,
                        featureScore,
                        supportScore,
                        paymentScore,
                        apiScore
                    });
                }
            });
        });
    });
}

if (require.main === module) {
    fixHealthScores().catch(console.error);
}

module.exports = { fixHealthScores };
