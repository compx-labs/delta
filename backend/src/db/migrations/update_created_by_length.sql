-- Migration: Update created_by column to TEXT type
-- This allows for unlimited length wallet addresses or creator identifiers

-- Alter the created_by column to TEXT (unlimited length)
ALTER TABLE pools ALTER COLUMN created_by TYPE TEXT;
