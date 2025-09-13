const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class CustomerService {
    constructor() {
        this.dbPath = process.env.DB_PATH || '/app/data/customer_health.db';
        console.log('CustomerService Database path:', this.dbPath);
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
                console.warn(`CustomerService Database file not found at: ${this.dbPath}`);
            }

            this.db = new sqlite3.Database(this.dbPath, (err) => {
                this.isInitialized = true;
                if (err) {
                    console.error('CustomerService Error opening database:', err);
                    this.db = null;
                    reject(err);
                } else {
                    console.log('CustomerService Connected to SQLite database');
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

    // Replace the getAllCustomers method in your customerService.js with this version:

    /**
     * Get all customers with health scores
     */
    async getAllCustomers(options = {}) {
        console.log('🔍 CustomerService.getAllCustomers called with options:', options);
        await this.ensureDatabaseConnection();

        return new Promise((resolve, reject) => {
            const { page = 1, limit = 20, segment, healthLevel, sortBy = 'overall_score', sortOrder = 'desc' } = options;
            const offset = (page - 1) * limit;

            let whereClause = '';
            let params = [];

            // Build WHERE clause for filters
            const conditions = [];
            if (segment) {
                conditions.push('c.segment = ?');
                params.push(segment);
            }
            if (healthLevel) {
                conditions.push('h.overall_score >= ? AND h.overall_score < ?');
                if (healthLevel === 'healthy') {
                    params.push(80, 101);
                } else if (healthLevel === 'at-risk') {
                    params.push(60, 80);
                } else if (healthLevel === 'critical') {
                    params.push(40, 60);
                } else if (healthLevel === 'churned') {
                    params.push(0, 40);
                }
            }

            if (conditions.length > 0) {
                whereClause = 'WHERE ' + conditions.join(' AND ');
            }

            // Validate sortBy to prevent SQL injection
            const allowedSortFields = ['overall_score', 'company_name', 'monthly_revenue', 'signup_date'];
            const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'overall_score';
            const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

            const query = `
            SELECT 
                c.id,
                c.company_name,
                c.contact_email,
                c.contact_name,
                c.segment,
                c.plan_type,
                c.monthly_revenue,
                c.signup_date,
                c.last_login_date,
                COALESCE(h.overall_score, 0) as overall_score,
                COALESCE(h.login_frequency_score, 0) as login_frequency_score,
                COALESCE(h.feature_adoption_score, 0) as feature_adoption_score,
                COALESCE(h.support_ticket_score, 0) as support_ticket_score,
                COALESCE(h.payment_timeliness_score, 0) as payment_timeliness_score,
                COALESCE(h.api_usage_score, 0) as api_usage_score,
                h.calculated_at
            FROM customers c
            LEFT JOIN (
                SELECT customer_id, overall_score, login_frequency_score, feature_adoption_score, 
                       support_ticket_score, payment_timeliness_score, api_usage_score, calculated_at,
                       ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY calculated_at DESC) as rn
                FROM health_scores
            ) h ON c.id = h.customer_id AND h.rn = 1
            ${whereClause}
            ORDER BY COALESCE(h.${sortField}, c.${sortField === 'overall_score' ? 'id' : sortField}) ${sortDirection}
            LIMIT ? OFFSET ?
        `;

            params.push(limit, offset);

            console.log('🔍 CustomerService Executing query:', query);
            console.log('🔍 CustomerService With params:', params);

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('🔍 CustomerService Database query error:', err);
                    reject(err);
                    return;
                }

                console.log(`🔍 CustomerService Found ${rows.length} raw customers from DB`);

                // Log first few raw results
                if (rows.length > 0) {
                    console.log('🔍 CustomerService First 3 raw customers:', JSON.stringify(rows.slice(0, 3), null, 2));
                }

                // Add health level to each customer
                const customers = rows.map((customer, index) => {
                    const healthLevel = this.getHealthLevel(customer.overall_score || 0);
                    const result = {
                        ...customer,
                        healthLevel
                    };

                    // Log first few processed customers
                    if (index < 3) {
                        console.log(`🔍 CustomerService Customer ${index + 1} - Score: ${customer.overall_score}, Level: ${healthLevel}`);
                    }

                    return result;
                });

                // Count health levels for debugging
                const healthCounts = {
                    healthy: customers.filter(c => c.healthLevel === 'healthy').length,
                    atRisk: customers.filter(c => c.healthLevel === 'at-risk').length,
                    critical: customers.filter(c => c.healthLevel === 'critical').length,
                    churned: customers.filter(c => c.healthLevel === 'churned').length
                };

                console.log('🔍 CustomerService Health level distribution:', healthCounts);
                console.log('🔍 CustomerService Returning', customers.length, 'customers');

                resolve(customers);
            });
        });
    }
    /**
     * Get customer by ID
     */
    async getCustomerById(customerId) {
        await this.ensureDatabaseConnection();

        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM customers WHERE id = ?',
                [customerId],
                (err, row) => {
                    if (err) {
                        console.error('CustomerService Database query error:', err);
                        reject(err);
                        return;
                    }
                    resolve(row);
                }
            );
        });
    }

    /**
     * Get customer metrics
     */
    async getCustomerMetrics(customerId) {
        await this.ensureDatabaseConnection();

        return new Promise((resolve, reject) => {
            // Get various metrics for the customer
            const queries = {
                totalEvents: 'SELECT COUNT(*) as count FROM customer_events WHERE customer_id = ?',
                recentEvents: 'SELECT COUNT(*) as count FROM customer_events WHERE customer_id = ? AND created_at >= datetime("now", "-30 days")',
                totalTickets: 'SELECT COUNT(*) as count FROM support_tickets WHERE customer_id = ?',
                openTickets: 'SELECT COUNT(*) as count FROM support_tickets WHERE customer_id = ? AND status IN ("open", "in_progress")',
                totalPayments: 'SELECT COUNT(*) as count FROM payments WHERE customer_id = ?',
                overduePayments: 'SELECT COUNT(*) as count FROM payments WHERE customer_id = ? AND status = "overdue"',
                featuresUsed: 'SELECT COUNT(DISTINCT feature_name) as count FROM feature_usage WHERE customer_id = ?',
                apiRequests: 'SELECT COALESCE(SUM(request_count), 0) as count FROM api_usage WHERE customer_id = ? AND date >= date("now", "-30 days")'
            };

            const metrics = {};
            let completed = 0;
            const total = Object.keys(queries).length;

            Object.entries(queries).forEach(([key, query]) => {
                this.db.get(query, [customerId], (err, row) => {
                    if (err) {
                        console.error(`CustomerService Error getting metric ${key}:`, err);
                        reject(err);
                        return;
                    }
                    metrics[key] = row?.count || 0;
                    completed++;

                    if (completed === total) {
                        resolve(metrics);
                    }
                });
            });
        });
    }

    /**
     * Record a customer event
     */
    async recordEvent(customerId, eventData) {
        await this.ensureDatabaseConnection();

        return new Promise((resolve, reject) => {
            const { eventType, eventData: data } = eventData;

            const stmt = this.db.prepare(`
                INSERT INTO customer_events (customer_id, event_type, event_data, created_at)
                VALUES (?, ?, ?, ?)
            `);

            stmt.run([
                customerId,
                eventType,
                JSON.stringify(data || {}),
                new Date().toISOString()
            ], function (err) {
                if (err) {
                    console.error('CustomerService Error recording event:', err);
                    reject(err);
                    return;
                }

                resolve({
                    id: this.lastID,
                    customerId,
                    eventType,
                    eventData: data,
                    createdAt: new Date().toISOString()
                });
            });

            stmt.finalize();
        });
    }

    /**
     * Get health level from score
     */
    getHealthLevel(score) {
        if (score >= 80) return 'healthy';
        if (score >= 60) return 'at-risk';
        if (score >= 40) return 'critical';
        return 'churned';
    }

    /**
     * Get total count of customers
     */
    async getTotalCustomerCount() {
        await this.ensureDatabaseConnection();

        return new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM customers', (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row?.count || 0);
                }
            });
        });
    }

    /**
     * Get health score trends over time
     */
    async getHealthTrends(months = 6) {
        await this.ensureDatabaseConnection();

        return new Promise((resolve, reject) => {
            const monthsAgo = new Date();
            monthsAgo.setMonth(monthsAgo.getMonth() - months);

            // Get monthly average health scores
            this.db.all(`
                SELECT 
                    strftime('%Y-%m', calculated_at) as month,
                    AVG(overall_score) as avgScore,
                    COUNT(*) as customerCount
                FROM health_scores 
                WHERE calculated_at >= ?
                GROUP BY strftime('%Y-%m', calculated_at)
                ORDER BY month
            `, [monthsAgo.toISOString()], (err, rows) => {
                if (err) {
                    console.error('CustomerService Error getting health trends:', err);
                    reject(err);
                    return;
                }

                // Format data for charts - return empty array if no data
                const trends = (rows || []).map(row => ({
                    month: row.month,
                    score: Math.round((row.avgScore || 0) * 100) / 100,
                    customerCount: row.customerCount || 0
                }));

                resolve(trends);
            });
        });
    }

    /**
     * Get usage trends over time
     */
    async getUsageTrends(months = 6) {
        await this.ensureDatabaseConnection();

        return new Promise((resolve, reject) => {
            const monthsAgo = new Date();
            monthsAgo.setMonth(monthsAgo.getMonth() - months);

            // Get monthly usage trends
            this.db.all(`
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    COUNT(CASE WHEN event_type = 'login' THEN 1 END) as logins,
                    COUNT(CASE WHEN event_type = 'api_call' THEN 1 END) as apiCalls
                FROM customer_events 
                WHERE created_at >= ?
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month
            `, [monthsAgo.toISOString()], (err, rows) => {
                if (err) {
                    console.error('CustomerService Error getting usage trends:', err);
                    reject(err);
                    return;
                }

                // Return empty array if no data
                const trends = (rows || []).map(row => ({
                    month: row.month,
                    logins: row.logins || 0,
                    apiCalls: row.apiCalls || 0
                }));

                resolve(trends);
            });
        });
    }

    /**
     * Get dashboard statistics directly from database
     */
    async getDashboardStats() {
        await this.ensureDatabaseConnection();

        return new Promise((resolve, reject) => {
            // Get total customers
            this.db.get('SELECT COUNT(*) as total FROM customers', (err, totalRow) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Get health score distribution
                this.db.all(`
                    SELECT 
                        CASE 
                            WHEN h.overall_score >= 80 THEN 'healthy'
                            WHEN h.overall_score >= 60 THEN 'at-risk'
                            WHEN h.overall_score >= 40 THEN 'critical'
                            ELSE 'churned'
                        END as health_level,
                        COUNT(*) as count
                    FROM customers c
                    LEFT JOIN health_scores h ON c.id = h.customer_id
                    GROUP BY health_level
                `, (err, healthRows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Get average health score
                    this.db.get(`
                        SELECT AVG(h.overall_score) as avg_score
                        FROM customers c
                        LEFT JOIN health_scores h ON c.id = h.customer_id
                        WHERE h.overall_score IS NOT NULL
                    `, (err, avgRow) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        // Initialize stats
                        const stats = {
                            total: totalRow.total,
                            healthy: 0,
                            atRisk: 0,
                            critical: 0,
                            churned: 0
                        };

                        // Process health level counts
                        healthRows.forEach(row => {
                            switch (row.health_level) {
                                case 'healthy':
                                    stats.healthy = row.count;
                                    break;
                                case 'at-risk':
                                    stats.atRisk = row.count;
                                    break;
                                case 'critical':
                                    stats.critical = row.count;
                                    break;
                                case 'churned':
                                    stats.churned = row.count;
                                    break;
                            }
                        });

                        resolve({
                            ...stats,
                            averageHealthScore: Math.round((avgRow.avg_score || 0) * 100) / 100
                        });
                    });
                });
            });
        });
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }
    /**
     * Get raw data for a specific health component
     */
    async getHealthComponentData(customerId, component) {
        await this.ensureDatabaseConnection();

        return new Promise((resolve, reject) => {
            let query;
            let params = [customerId];

            switch (component) {
                case 'login-events':
                    query = `
                        SELECT 
                            id,
                            event_type,
                            event_data,
                            created_at
                        FROM customer_events 
                        WHERE customer_id = ? AND event_type = 'login'
                        ORDER BY created_at DESC
                        LIMIT 100
                    `;
                    break;

                case 'feature-usage':
                    query = `
                        SELECT 
                            id,
                            feature_name,
                            usage_count,
                            last_used,
                            created_at,
                            updated_at
                        FROM feature_usage 
                        WHERE customer_id = ?
                        ORDER BY usage_count DESC, last_used DESC
                    `;
                    break;

                case 'support-tickets':
                    query = `
                        SELECT 
                            id,
                            ticket_id,
                            priority,
                            status,
                            subject,
                            created_at,
                            resolved_at
                        FROM support_tickets 
                        WHERE customer_id = ?
                        ORDER BY created_at DESC
                        LIMIT 100
                    `;
                    break;

                case 'payments':
                    query = `
                        SELECT 
                            id,
                            invoice_id,
                            amount,
                            due_date,
                            paid_date,
                            status,
                            created_at
                        FROM payments 
                        WHERE customer_id = ?
                        ORDER BY due_date DESC
                        LIMIT 100
                    `;
                    break;

                case 'api-usage':
                    query = `
                        SELECT 
                            id,
                            endpoint,
                            request_count,
                            date,
                            created_at
                        FROM api_usage 
                        WHERE customer_id = ?
                        ORDER BY date DESC
                        LIMIT 100
                    `;
                    break;

                default:
                    return reject(new Error(`Invalid health component: ${component}`));
            }

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('CustomerService Error fetching health component data:', err);
                    reject(err);
                    return;
                }

                // Format the data for better display
                const formattedData = rows.map(row => {
                    const formatted = { ...row };

                    // Format dates
                    if (formatted.created_at) {
                        formatted.created_at = new Date(formatted.created_at).toLocaleString();
                    }
                    if (formatted.updated_at) {
                        formatted.updated_at = new Date(formatted.updated_at).toLocaleString();
                    }
                    if (formatted.last_used) {
                        formatted.last_used = new Date(formatted.last_used).toLocaleString();
                    }
                    if (formatted.resolved_at) {
                        formatted.resolved_at = new Date(formatted.resolved_at).toLocaleString();
                    }
                    if (formatted.due_date) {
                        formatted.due_date = new Date(formatted.due_date).toLocaleDateString();
                    }
                    if (formatted.paid_date) {
                        formatted.paid_date = new Date(formatted.paid_date).toLocaleDateString();
                    }
                    if (formatted.date) {
                        formatted.date = new Date(formatted.date).toLocaleDateString();
                    }

                    // Format amounts
                    if (formatted.amount) {
                        formatted.amount = `$${formatted.amount.toFixed(2)}`;
                    }

                    // Parse JSON event data
                    if (formatted.event_data) {
                        try {
                            formatted.event_data = JSON.parse(formatted.event_data);
                        } catch (e) {
                            // Keep as string if not valid JSON
                        }
                    }

                    return formatted;
                });

                resolve(formattedData);
            });
        });
    }
}

module.exports = CustomerService;