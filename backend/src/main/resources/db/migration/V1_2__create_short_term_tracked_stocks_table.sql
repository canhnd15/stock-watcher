-- Create short_term_tracked_stocks table
CREATE TABLE IF NOT EXISTS short_term_tracked_stocks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    code VARCHAR(16) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    cost_basis NUMERIC(19, 2),
    volume BIGINT,
    target_price NUMERIC(19, 2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_short_term_tracked_stocks_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_code_short_term UNIQUE (user_id, code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_short_term_tracked_stocks_user 
    ON short_term_tracked_stocks(user_id);
    
CREATE INDEX IF NOT EXISTS idx_short_term_tracked_stocks_code 
    ON short_term_tracked_stocks(code);

