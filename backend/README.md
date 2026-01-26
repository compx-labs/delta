# Delta Backend API

Backend API for Delta staking pool platform, built with Express.js and Supabase PostgreSQL.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_PUBLISHABLE_DEFAULT_KEY`: Your Supabase publishable key (found in Supabase dashboard > Settings > API)
- `PORT`: Server port (default: 3001)
- `CORS_ORIGIN`: Frontend URL (default: http://localhost:5173)

### 3. Set Up Database Schema

Run the SQL schema in your Supabase SQL editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `src/db/schema.sql`
4. Execute the SQL

Alternatively, you can use the Supabase CLI or run migrations programmatically.

### 4. Run the Server

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Check server status

### Pools

- `POST /api/pools` - Create a new pool
  ```json
  {
    "stake_token": "string",
    "reward_token": "string",
    "total_rewards": 1000.0,
    "name": "Pool Name",
    "created_by": "optional",
    "website_url": "https://example.com",
    "description": "Optional description",
    "tags": ["tag1", "tag2"]
  }
  ```

- `GET /api/pools` - Get all pools
- `GET /api/pools/:id` - Get pool by UUID
- `GET /api/pools/app/:appId` - Get pool by app_id (on-chain ID)
- `PATCH /api/pools/:id` - Update pool metadata
- `DELETE /api/pools/:id` - Delete pool

## Database Schema

The `pools` table includes:

- `id` (UUID) - Primary key
- `app_id` (BIGINT) - On-chain Algorand application ID (unique)
- `stake_token` (VARCHAR) - Stake asset ID
- `reward_token` (VARCHAR) - Reward asset ID
- `total_rewards` (DECIMAL) - Total reward amount
- `name` (VARCHAR 48) - Pool name (required)
- `created_by` (VARCHAR 48) - Creator identifier
- `website_url` (TEXT) - Optional website URL
- `description` (VARCHAR 140) - Optional description
- `tags` (TEXT[]) - Array of tags (max 3)
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

## Development

The backend uses:
- **Express.js** - Web framework
- **Supabase** - PostgreSQL database
- **TypeScript** - Type safety
- **Zod** - Request validation
- **tsx** - TypeScript execution for development

## Notes

- The `app_id` field is set after the pool is created on-chain
- Tags are stored as a PostgreSQL array (max 3 items)
- All timestamps are automatically managed by the database
