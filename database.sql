-- TradeSense MVP Database Schema

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- 'user' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL, -- starter, pro, elite
    price_dh INTEGER NOT NULL,
    features_json TEXT, -- JSON string of features
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paypal_settings (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN DEFAULT FALSE,
    client_id VARCHAR(200),
    client_secret VARCHAR(200),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    plan_id INTEGER REFERENCES plans(id),
    start_balance FLOAT NOT NULL,
    equity FLOAT NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, failed, passed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    passed_at TIMESTAMP,
    failed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER REFERENCES challenges(id),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL, -- buy, sell
    qty FLOAT NOT NULL,
    price FLOAT NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_metrics (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER REFERENCES challenges(id),
    date DATE NOT NULL,
    day_start_equity FLOAT NOT NULL,
    day_end_equity FLOAT,
    day_pnl FLOAT,
    max_intraday_drawdown_pct FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Plans
INSERT INTO plans (slug, price_dh, features_json) VALUES 
('starter', 200, '{"balance": 5000, "profit_target": 0.10, "max_loss": 0.10, "daily_loss": 0.05}'),
('pro', 500, '{"balance": 25000, "profit_target": 0.10, "max_loss": 0.10, "daily_loss": 0.05}'),
('elite', 1000, '{"balance": 100000, "profit_target": 0.10, "max_loss": 0.10, "daily_loss": 0.05}')
ON CONFLICT (slug) DO NOTHING;

-- Seed Admin User (password: admin123)
-- Hash generated for 'admin123' might vary, usually handled by app logic, but here is a placeholder if needed manually.
-- INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', 'admin@tradesense.com', 'scrypt:32768:8:1$W...', 'admin');
