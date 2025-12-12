-- Create staging table with same structure as trades
CREATE TABLE IF NOT EXISTS trades_staging (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(16) NOT NULL,
    price NUMERIC NOT NULL,
    volume BIGINT NOT NULL,
    side VARCHAR(8) NOT NULL,
    trade_date VARCHAR(10) NOT NULL,
    trade_time VARCHAR(8) NOT NULL,
    trade_date_numeric INTEGER GENERATED ALWAYS AS (
        CAST(
            SUBSTRING(trade_date, 7, 4) || 
            SUBSTRING(trade_date, 4, 2) || 
            SUBSTRING(trade_date, 1, 2)
        AS INTEGER)
    ) STORED
);

-- Create same indexes as trades table
CREATE INDEX IF NOT EXISTS idx_trades_staging_code_date_time 
    ON trades_staging(code, trade_date, trade_time);
    
CREATE INDEX IF NOT EXISTS idx_trades_staging_volume 
    ON trades_staging(volume);
    
CREATE INDEX IF NOT EXISTS idx_trades_staging_price 
    ON trades_staging(price);
    
CREATE INDEX IF NOT EXISTS idx_trades_staging_code_date_numeric 
    ON trades_staging(code, trade_date_numeric DESC, trade_time);

