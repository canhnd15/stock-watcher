-- Create price_alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    code VARCHAR(16) NOT NULL,
    reach_price NUMERIC(19, 2),
    drop_price NUMERIC(19, 2),
    reach_volume NUMERIC(19, 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_price_alerts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_code_price_alert UNIQUE (user_id, code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_code ON price_alerts(code);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(active);

