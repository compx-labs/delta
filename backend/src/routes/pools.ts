import { Router, type Request, type Response } from 'express'
import { supabase } from '../db/client.js'
import { createPoolSchema, updatePoolSchema } from '../validators/pool.js'
import type { CreatePoolRequest, UpdatePoolRequest } from '../types/pool.js'

const router: Router = Router()

// Create a new pool
router.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = createPoolSchema.safeParse(req.body)
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      })
    }

    const data: CreatePoolRequest = validationResult.data

    const { data: pool, error } = await supabase
      .from('pools')
      .insert({
        stake_token: data.stake_token,
        reward_token: data.reward_token,
        total_rewards: data.total_rewards,
        name: data.name,
        created_by: data.created_by,
        website_url: data.website_url || null,
        description: data.description || null,
        tags: data.tags || null,
        creation_status: 'pending',
        step_create_completed: false,
        step_init_completed: false,
        step_fund_activate_register_completed: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({
        error: 'Failed to create pool',
        details: error.message
      })
    }

    res.status(201).json(pool)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get all pools
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: pools, error } = await supabase
      .from('pools')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({
        error: 'Failed to fetch pools',
        details: error.message
      })
    }

    res.json(pools)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get pool by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { data: pool, error } = await supabase
      .from('pools')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Pool not found' })
      }
      console.error('Database error:', error)
      return res.status(500).json({
        error: 'Failed to fetch pool',
        details: error.message
      })
    }

    res.json(pool)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get pool by app_id
router.get('/app/:appId', async (req: Request, res: Response) => {
  try {
    const appIdParam = req.params.appId
    const appId = parseInt(Array.isArray(appIdParam) ? appIdParam[0] : appIdParam, 10)

    if (isNaN(appId)) {
      return res.status(400).json({ error: 'Invalid app ID' })
    }

    const { data: pool, error } = await supabase
      .from('pools')
      .select('*')
      .eq('app_id', appId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Pool not found' })
      }
      console.error('Database error:', error)
      return res.status(500).json({
        error: 'Failed to fetch pool',
        details: error.message
      })
    }

    res.json(pool)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Update pool
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const validationResult = updatePoolSchema.safeParse(req.body)
    
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      })
    }

    const updates: UpdatePoolRequest = validationResult.data

    const { data: pool, error } = await supabase
      .from('pools')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Pool not found' })
      }
      console.error('Database error:', error)
      return res.status(500).json({
        error: 'Failed to update pool',
        details: error.message
      })
    }

    res.json(pool)
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Delete pool
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('pools')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({
        error: 'Failed to delete pool',
        details: error.message
      })
    }

    res.status(204).send()
  } catch (error) {
    console.error('Unexpected error:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
