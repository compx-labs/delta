# Backend Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to Settings > API to get your:
   - Project URL (`SUPABASE_URL`)
   - Publishable Key (`SUPABASE_PUBLISHABLE_DEFAULT_KEY`)

### 3. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_publishable_key_here
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### 4. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `src/db/schema.sql`
4. Paste and execute in the SQL Editor

This will create the `pools` table with all necessary indexes and triggers.

### 5. Run the Server

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

The server will start on `http://localhost:3001`

## Frontend Integration

The frontend is already configured to use this backend. Make sure:

1. The backend is running on port 3001 (or update `VITE_DELTA_BACKEND_URL` in frontend `.env`)
2. CORS is configured to allow requests from your frontend URL (default: `http://localhost:5173`)

## Testing the API

### Health Check
```bash
curl http://localhost:3001/health
```

### Create a Pool
```bash
curl -X POST http://localhost:3001/api/pools \
  -H "Content-Type: application/json" \
  -d '{
    "stake_token": "123456",
    "reward_token": "789012",
    "total_rewards": 1000.0,
    "name": "Test Pool",
    "created_by": "Test Creator",
    "description": "A test pool",
    "tags": ["Governance", "Infrastructure"]
  }'
```

### Get All Pools
```bash
curl http://localhost:3001/api/pools
```

## Database Schema

The `pools` table structure:

- `id` (UUID) - Primary key, auto-generated
- `app_id` (BIGINT) - On-chain Algorand application ID (set after on-chain creation)
- `stake_token` (VARCHAR) - Stake asset ID
- `reward_token` (VARCHAR) - Reward asset ID  
- `total_rewards` (DECIMAL) - Total reward amount
- `name` (VARCHAR 48) - Pool name (required)
- `created_by` (VARCHAR 48) - Creator identifier
- `website_url` (TEXT) - Optional website URL
- `description` (VARCHAR 140) - Optional description
- `tags` (TEXT[]) - Array of tags (max 3)
- `created_at` (TIMESTAMP) - Auto-set on creation
- `updated_at` (TIMESTAMP) - Auto-updated on modification

## Notes

- The `app_id` field starts as `null` and should be updated after the pool is created on-chain
- Tags are stored as a PostgreSQL array
- All timestamps are managed automatically by the database
