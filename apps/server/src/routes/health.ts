import { Router } from 'express'
import { ok } from '../utils/response.js'

export const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  ok(res, { status: 'up', time: new Date().toISOString() })
})
