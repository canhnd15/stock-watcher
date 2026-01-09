-- Create app_config table
CREATE TABLE IF NOT EXISTS app_config (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value VARCHAR(500) NOT NULL,
    description VARCHAR(255)
);

-- Create index on config_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(config_key);

