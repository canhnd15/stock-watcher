ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS trade_date_numeric INTEGER 
GENERATED ALWAYS AS (
    CAST(
        SUBSTRING(trade_date, 7, 4) || 
        SUBSTRING(trade_date, 4, 2) || 
        SUBSTRING(trade_date, 1, 2)
    AS INTEGER)
) STORED;

CREATE INDEX IF NOT EXISTS idx_trades_code_date_numeric 
ON trades(code, trade_date_numeric DESC, trade_time);
