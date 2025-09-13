-- Customer Health Dashboard Database Schema (SQLite)

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    segment TEXT NOT NULL CHECK (segment IN ('enterprise', 'smb', 'startup')),
    plan_type TEXT NOT NULL,
    monthly_revenue REAL NOT NULL,
    signup_date DATE NOT NULL,
    last_login_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customer events table (login, feature usage, support tickets, etc.)
CREATE TABLE IF NOT EXISTS customer_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_data TEXT, -- JSON as TEXT in SQLite
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Feature usage tracking
CREATE TABLE IF NOT EXISTS feature_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    feature_name TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_used DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    ticket_id TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    subject TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Payment history
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    invoice_id TEXT NOT NULL,
    amount REAL NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 0,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Health scores (calculated and stored) - UPDATED with unique constraint
CREATE TABLE IF NOT EXISTS health_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL UNIQUE, -- Added UNIQUE constraint
    overall_score REAL NOT NULL,
    login_frequency_score REAL NOT NULL,
    feature_adoption_score REAL NOT NULL,
    support_ticket_score REAL NOT NULL,
    payment_timeliness_score REAL NOT NULL,
    api_usage_score REAL NOT NULL,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);
CREATE INDEX IF NOT EXISTS idx_customer_events_customer_id ON customer_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_type ON customer_events(event_type);
CREATE INDEX IF NOT EXISTS idx_customer_events_created_at ON customer_events(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_customer_id ON feature_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_customer_id ON api_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage(date);
CREATE INDEX IF NOT EXISTS idx_health_scores_customer_id ON health_scores(customer_id);
