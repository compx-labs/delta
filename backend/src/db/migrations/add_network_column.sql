-- Migration: Add network column to pools table
-- This allows filtering pools by network (testnet/mainnet) to prevent 404 errors
-- when querying pools from the wrong network

-- Add network column (testnet or mainnet)
ALTER TABLE pools ADD COLUMN IF NOT EXISTS network VARCHAR(10) DEFAULT 'mainnet';

-- Add constraint to ensure network is either 'testnet' or 'mainnet'
ALTER TABLE pools ADD CONSTRAINT check_network CHECK (network IN ('testnet', 'mainnet'));

-- Add index on network for fast filtering
CREATE INDEX IF NOT EXISTS idx_pools_network ON pools(network);

-- Add composite index on network and app_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pools_network_app_id ON pools(network, app_id);

-- Update existing pools to mainnet (assuming existing pools are mainnet)
-- If you have testnet pools, you'll need to manually update them
UPDATE pools SET network = 'mainnet' WHERE network IS NULL OR network = '';
