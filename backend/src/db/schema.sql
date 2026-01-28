-- Create pools table
CREATE TABLE IF NOT EXISTS pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id BIGINT UNIQUE,
  stake_token VARCHAR(255) NOT NULL,
  reward_token VARCHAR(255) NOT NULL,
  total_rewards DECIMAL(20, 6) NOT NULL,
  name VARCHAR(48) NOT NULL,
  created_by TEXT,
  website_url TEXT,
  description VARCHAR(140),
  tags TEXT[], -- Array of tags (up to 3)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on app_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_pools_app_id ON pools(app_id);

-- Create index on stake_token and reward_token for filtering
CREATE INDEX IF NOT EXISTS idx_pools_stake_token ON pools(stake_token);
CREATE INDEX IF NOT EXISTS idx_pools_reward_token ON pools(reward_token);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_pools_created_at ON pools(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON pools
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
