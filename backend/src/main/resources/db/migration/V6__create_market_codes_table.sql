-- Create market_codes table for dynamic stock code management
CREATE TABLE IF NOT EXISTS market_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_market_codes_code ON market_codes(code);
CREATE INDEX IF NOT EXISTS idx_market_codes_active ON market_codes(active);

-- Seed with default VN30 stock codes
INSERT INTO market_codes (code) VALUES
('ACB'), ('BCM'), ('BID'), ('CTG'), ('DGC'), ('FPT'), ('GAS'), ('GVR'), ('HDB'), ('HPG'),
('LPB'), ('MBB'), ('MSN'), ('MWG'), ('PLX'), ('SAB'), ('SHB'), ('SSB'), ('SSI'), ('STB'),
('TCB'), ('TPB'), ('VCB'), ('VHM'), ('VIB'), ('VIC'), ('VJC'), ('VNM'), ('VPB'), ('VRE')
ON CONFLICT (code) DO NOTHING;
