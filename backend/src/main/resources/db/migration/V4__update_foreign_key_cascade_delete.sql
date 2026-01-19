-- Update foreign key constraints to include ON DELETE CASCADE
-- This ensures that when a user is deleted, all related records are automatically deleted

-- Update short_term_tracked_stocks foreign key constraint
-- Drop the specific constraint mentioned in the error, or find and drop any FK on user_id
DO $$
DECLARE
    constraint_record RECORD;
    user_id_attnum INTEGER;
BEGIN
    -- Get the attribute number for user_id
    SELECT attnum INTO user_id_attnum
    FROM pg_attribute 
    WHERE attrelid = 'short_term_tracked_stocks'::regclass 
    AND attname = 'user_id';
    
    -- Find all foreign key constraints on user_id column in short_term_tracked_stocks
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'short_term_tracked_stocks'::regclass
        AND contype = 'f'
        AND user_id_attnum = ANY(conkey::int[])
    LOOP
        EXECUTE format('ALTER TABLE short_term_tracked_stocks DROP CONSTRAINT %I', constraint_record.conname);
    END LOOP;
END $$;

-- Add new constraint with ON DELETE CASCADE for short_term_tracked_stocks
ALTER TABLE short_term_tracked_stocks 
ADD CONSTRAINT fk_short_term_tracked_stocks_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update vip_requests foreign key constraint for user field
DO $$
DECLARE
    constraint_record RECORD;
    user_id_attnum INTEGER;
BEGIN
    -- Get the attribute number for user_id
    SELECT attnum INTO user_id_attnum
    FROM pg_attribute 
    WHERE attrelid = 'vip_requests'::regclass 
    AND attname = 'user_id';
    
    -- Find all foreign key constraints on user_id column in vip_requests
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'vip_requests'::regclass
        AND contype = 'f'
        AND user_id_attnum = ANY(conkey::int[])
    LOOP
        EXECUTE format('ALTER TABLE vip_requests DROP CONSTRAINT %I', constraint_record.conname);
    END LOOP;
END $$;

-- Add new constraint with ON DELETE CASCADE for vip_requests
ALTER TABLE vip_requests 
ADD CONSTRAINT fk_vip_requests_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
