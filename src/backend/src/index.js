const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import routes
const customerRoutes = require('./routes/customers');
const dashboardRoutes = require('./routes/dashboard');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
let isDatabaseReady = false;

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        database: isDatabaseReady ? 'ready' : 'initializing'
    });
});

// Original debug endpoint
app.get('/api/debug', async (req, res) => {
    try {
        const sqlite3 = require('sqlite3').verbose();
        const dbPath = process.env.DB_PATH || '/app/data/customer_health.db';
        const fs = require('fs');

        const debug = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            dbPath,
            dbExists: fs.existsSync(dbPath),
            dbDirectory: require('path').dirname(dbPath),
            dbDirectoryExists: fs.existsSync(require('path').dirname(dbPath))
        };

        // Try to connect to database
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                debug.dbConnectionError = err.message;
                res.json({ success: false, debug });
            } else {
                // Try to query customers table
                db.get('SELECT COUNT(*) as count FROM customers', (err, row) => {
                    if (err) {
                        debug.queryError = err.message;
                        db.close();
                        res.json({ success: false, debug });
                    } else {
                        debug.customerCount = row.count;

                        // Try to query health_scores table
                        db.get('SELECT COUNT(*) as count FROM health_scores', (err, row) => {
                            if (err) {
                                debug.healthScoresError = err.message;
                            } else {
                                debug.healthScoreCount = row.count;
                            }

                            db.close();
                            res.json({ success: true, debug });
                        });
                    }
                });
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            debug: {
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development'
            }
        });
    }
});

// Enhanced debug endpoint to inspect actual database data
app.get('/api/debug/database', async (req, res) => {
    try {
        const sqlite3 = require('sqlite3').verbose();
        const dbPath = process.env.DB_PATH || '/app/data/customer_health.db';

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            // Get sample customers with their health scores
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
                    h.overall_score,
                    h.login_frequency_score,
                    h.feature_adoption_score,
                    h.support_ticket_score,
                    h.payment_timeliness_score,
                    h.api_usage_score,
                    h.calculated_at
                FROM customers c
                LEFT JOIN (
                    SELECT customer_id, overall_score, login_frequency_score, feature_adoption_score, 
                           support_ticket_score, payment_timeliness_score, api_usage_score, calculated_at,
                           ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY calculated_at DESC) as rn
                    FROM health_scores
                ) h ON c.id = h.customer_id AND h.rn = 1
                ORDER BY c.id
                LIMIT 5
            `;

            db.all(query, [], (err, rows) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ success: false, error: err.message });
                }

                // Get health score distribution
                db.all(`
                    SELECT 
                        CASE 
                            WHEN h.overall_score >= 80 THEN 'healthy'
                            WHEN h.overall_score >= 60 THEN 'at-risk'
                            WHEN h.overall_score >= 40 THEN 'critical'
                            ELSE 'churned'
                        END as health_level,
                        COUNT(*) as count,
                        AVG(h.overall_score) as avg_score
                    FROM customers c
                    LEFT JOIN (
                        SELECT customer_id, overall_score,
                               ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY calculated_at DESC) as rn
                        FROM health_scores
                    ) h ON c.id = h.customer_id AND h.rn = 1
                    GROUP BY health_level
                    ORDER BY avg_score DESC
                `, [], (err, healthStats) => {
                    db.close();

                    if (err) {
                        return res.status(500).json({ success: false, error: err.message });
                    }

                    res.json({
                        success: true,
                        debug: {
                            timestamp: new Date().toISOString(),
                            sampleCustomers: rows,
                            healthDistribution: healthStats,
                            totalSampleCustomers: rows.length
                        }
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debug endpoint to trace what the API returns vs what the service returns
app.get('/api/debug/customers', async (req, res) => {
    try {
        console.log('🔍 DEBUG: Starting /api/debug/customers');

        // Import your services
        const CustomerService = require('./services/customerService');
        const customerService = new CustomerService();

        // Call the service method directly
        console.log('🔍 DEBUG: Calling customerService.getAllCustomers with limit=10');
        const serviceResult = await customerService.getAllCustomers({ limit: 10 });

        console.log('🔍 DEBUG: Service returned:', JSON.stringify(serviceResult.slice(0, 2), null, 2));

        // Add health levels manually to see if that's the issue
        const customersWithHealthLevels = serviceResult.map(customer => {
            const score = customer.overall_score || 0;
            let healthLevel = 'churned';
            if (score >= 80) healthLevel = 'healthy';
            else if (score >= 60) healthLevel = 'at-risk';
            else if (score >= 40) healthLevel = 'critical';

            return {
                ...customer,
                healthLevel,
                debug_original_score: customer.overall_score,
                debug_calculated_level: healthLevel
            };
        });

        console.log('🔍 DEBUG: After adding health levels:', JSON.stringify(customersWithHealthLevels.slice(0, 2), null, 2));

        res.json({
            success: true,
            debug: {
                timestamp: new Date().toISOString(),
                serviceResultCount: serviceResult.length,
                sampleCustomers: customersWithHealthLevels.slice(0, 5),
                healthLevelDistribution: {
                    healthy: customersWithHealthLevels.filter(c => c.healthLevel === 'healthy').length,
                    atRisk: customersWithHealthLevels.filter(c => c.healthLevel === 'at-risk').length,
                    critical: customersWithHealthLevels.filter(c => c.healthLevel === 'critical').length,
                    churned: customersWithHealthLevels.filter(c => c.healthLevel === 'churned').length
                }
            }
        });
    } catch (error) {
        console.error('🔍 DEBUG ERROR:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Debug endpoint to compare what frontend receives vs what backend sends
app.get('/api/debug/frontend-data', async (req, res) => {
    try {
        console.log('🔍 DEBUG: Simulating frontend API calls');

        // Simulate the exact same calls the frontend makes
        const axios = require('axios');
        const baseURL = 'http://localhost:3001';

        try {
            // Call customers API
            console.log('🔍 DEBUG: Calling /api/customers?limit=100');
            const customersResponse = await axios.get(`${baseURL}/api/customers?limit=100`);
            console.log('🔍 DEBUG: Customers API response length:', customersResponse.data.data?.length);

            // Call dashboard stats API
            console.log('🔍 DEBUG: Calling /api/dashboard/stats');
            const statsResponse = await axios.get(`${baseURL}/api/dashboard/stats`);
            console.log('🔍 DEBUG: Stats API response:', JSON.stringify(statsResponse.data.data, null, 2));

            res.json({
                success: true,
                debug: {
                    timestamp: new Date().toISOString(),
                    customersCount: customersResponse.data.data?.length || 0,
                    customersFirstFew: (customersResponse.data.data || []).slice(0, 3),
                    dashboardStats: statsResponse.data.data,
                    healthDistribution: {
                        fromCustomersData: {
                            healthy: (customersResponse.data.data || []).filter(c => c.healthLevel === 'healthy').length,
                            atRisk: (customersResponse.data.data || []).filter(c => c.healthLevel === 'at-risk').length,
                            critical: (customersResponse.data.data || []).filter(c => c.healthLevel === 'critical').length,
                            churned: (customersResponse.data.data || []).filter(c => c.healthLevel === 'churned').length
                        },
                        fromStatsAPI: statsResponse.data.data?.stats
                    }
                }
            });
        } catch (apiError) {
            res.json({
                success: false,
                error: 'API call failed',
                details: apiError.message,
                debug: {
                    timestamp: new Date().toISOString()
                }
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Mount routes
app.use('/api/customers', customerRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve React app build files
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
console.log('Looking for frontend build at:', frontendBuildPath);
console.log('Frontend build exists:', require('fs').existsSync(frontendBuildPath));

app.use(express.static(frontendBuildPath));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});

// Error handling middleware
app.use(errorHandler);

// Database path for Cloud Run
const dbPath = process.env.DB_PATH || '/tmp/customer_health.db';

// Start server immediately, initialize database in background
if (process.env.NODE_ENV !== 'test') {
    console.log('🚀 Starting server immediately...');
    
    // Start the server first to avoid Cloud Run timeout
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Customer Health API server running on port ${PORT}`);
        console.log(` Health check: http://0.0.0.0:${PORT}/api/health`);
        console.log(`👥 Customers API: http://0.0.0.0:${PORT}/api/customers`);
        console.log(`📊 Dashboard API: http://0.0.0.0:${PORT}/api/dashboard`);
        
        // Initialize database in background with better error handling
        setTimeout(() => {
            console.log(' Initializing database in background...');
            try {
                const { initializeDatabase } = require('../../database/init-db');
                initializeDatabase()
                    .then(() => {
                        console.log('✅ Database initialized successfully');
                        isDatabaseReady = true;
                    })
                    .catch(err => {
                        console.error('❌ Database initialization failed:', err);
                        console.log('⚠️  Server will continue running without database');
                        // Don't exit - server is already running
                    });
            } catch (err) {
                console.error('❌ Error loading database initialization:', err);
                console.log('⚠️  Server will continue running without database');
            }
        }, 2000); // Wait 2 seconds before starting DB init
    });

    // Handle server errors
    server.on('error', (err) => {
        console.error('❌ Server error:', err);
    });
}

module.exports = app;