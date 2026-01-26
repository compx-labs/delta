-- Migration: Add creation status tracking to pools table
-- This allows tracking of partially created pools so users can resume creation

-- Add creation_status column (pending, creating, completed, failed)
ALTER TABLE pools ADD COLUMN IF NOT EXISTS creation_status VARCHAR(20) DEFAULT 'pending';

-- Add step tracking columns
ALTER TABLE pools ADD COLUMN IF NOT EXISTS step_create_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE pools ADD COLUMN IF NOT EXISTS step_init_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE pools ADD COLUMN IF NOT EXISTS step_fund_activate_register_completed BOOLEAN DEFAULT FALSE;

-- Make created_by NOT NULL since it will always be set from the wallet
ALTER TABLE pools ALTER COLUMN created_by SET NOT NULL;

-- Add index on creation_status for filtering
CREATE INDEX IF NOT EXISTS idx_pools_creation_status ON pools(creation_status);

-- Add index on created_by for filtering user's pools
CREATE INDEX IF NOT EXISTS idx_pools_created_by ON pools(created_by);
