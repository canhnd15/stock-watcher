-- Create tracked_stocks table
CREATE TABLE IF NOT EXISTS tracked_stocks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    code VARCHAR(16) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    cost_basis NUMERIC(19, 2),
    volume BIGINT,
    target_price NUMERIC(19, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_tracked_stocks_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_code UNIQUE (user_id, code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tracked_stocks_user ON tracked_stocks(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_stocks_code ON tracked_stocks(code);

