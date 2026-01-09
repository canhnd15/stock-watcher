-- Create vip_requests table
CREATE TABLE IF NOT EXISTS vip_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reason VARCHAR(500),
    admin_note VARCHAR(500),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by_id BIGINT,
    CONSTRAINT fk_vip_requests_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_vip_requests_processed_by 
        FOREIGN KEY (processed_by_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_vip_request_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vip_requests_user_id ON vip_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_requests_status ON vip_requests(status);

