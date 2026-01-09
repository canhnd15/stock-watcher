-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(16) NOT NULL,
    price NUMERIC NOT NULL,
    volume BIGINT NOT NULL,
    side VARCHAR(8) NOT NULL,
    trade_date VARCHAR(10) NOT NULL,
    trade_time VARCHAR(8) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trades_code_date_time 
    ON trades(code, trade_date, trade_time);
    
CREATE INDEX IF NOT EXISTS idx_trades_volume 
    ON trades(volume);
    
CREATE INDEX IF NOT EXISTS idx_trades_price 
    ON trades(price);
