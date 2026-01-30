# Migration: Add Network Column to Pools Table

This migration adds a `network` column to the `pools` table to track whether each pool is on testnet or mainnet. This prevents 404 errors when querying pools from the wrong network.

## What This Migration Does

1. Adds a `network` column (VARCHAR(10)) with values 'testnet' or 'mainnet'
2. Sets default value to 'mainnet' for existing pools
3. Adds a CHECK constraint to ensure only valid network values
4. Creates indexes for efficient filtering by network
5. Updates existing pools to 'mainnet' (assuming they're mainnet pools)

## Running the Migration

### Option 1: Using Supabase SQL Editor (Recommended)

1. Open your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `src/db/migrations/add_network_column.sql`
4. Paste and execute the SQL

### Option 2: Using the Migration Script

```bash
pnpm run migrate:network
```

**Note:** The script may not work if Supabase RPC functions aren't configured. In that case, use Option 1.

## Verification

After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'pools' AND column_name = 'network';

-- Check existing pools
SELECT id, name, network, app_id FROM pools LIMIT 10;

-- Test filtering
SELECT * FROM pools WHERE network = 'mainnet';
SELECT * FROM pools WHERE network = 'testnet';
```

## Updating Existing Pools

If you have testnet pools in your database, you'll need to manually update them:

```sql
-- Update specific pools to testnet (replace with actual app_ids)
UPDATE pools SET network = 'testnet' WHERE app_id IN (123456, 789012);
```

## API Changes

### Creating Pools

The `POST /api/pools` endpoint now requires a `network` field:

```json
{
  "stake_token": "123456",
  "reward_token": "789012",
  "total_rewards": 1000.0,
  "name": "My Pool",
  "created_by": "ALGO...",
  "network": "mainnet",  // NEW: Required field
  "website_url": "https://example.com",
  "description": "Pool description",
  "tags": ["tag1", "tag2"]
}
```

### Getting Pools

All GET endpoints now require a `network` query parameter:

- `GET /api/pools?network=mainnet` - Get all mainnet pools
- `GET /api/pools?network=testnet` - Get all testnet pools
- `GET /api/pools/app/:appId?network=mainnet` - Get pool by app_id on mainnet
- `GET /api/pools/app/:appId?network=testnet` - Get pool by app_id on testnet

## Frontend Updates Required

The frontend will need to be updated to:
1. Include `network` field when creating pools
2. Add `?network=testnet` or `?network=mainnet` to all API calls based on the selected network
