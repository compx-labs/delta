import { z } from 'zod'

export const createPoolSchema = z.object({
  stake_token: z.string().min(1, 'Stake token is required'),
  reward_token: z.string().min(1, 'Reward token is required'),
  total_rewards: z.number().positive('Total rewards must be positive'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(48, 'Name must be at most 48 characters'),
  created_by: z.string().min(1, 'Created by is required'),
  website_url: z.string().url('Invalid URL format').optional().or(z.literal('')),
  description: z.string().max(140, 'Description must be at most 140 characters').optional(),
  tags: z.array(z.string()).max(3, 'Maximum 3 tags allowed').optional(),
})

export const updatePoolSchema = z.object({
  app_id: z.number().int().positive().optional(),
  name: z.string().min(2).max(48).optional(),
  website_url: z.string().url().optional().or(z.literal('')),
  description: z.string().max(140).optional(),
  tags: z.array(z.string()).max(3).optional(),
  creation_status: z.enum(['pending', 'creating', 'completed', 'failed']).optional(),
  step_create_completed: z.boolean().optional(),
  step_init_completed: z.boolean().optional(),
  step_fund_activate_register_completed: z.boolean().optional(),
})
