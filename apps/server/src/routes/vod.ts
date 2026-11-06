import { Router } from 'express'
import { z } from 'zod'
import { aggregateSearch } from '../services/libretv/search.js'
import { fetchDetail } from '../services/libretv/detail.js'
import { listSources } from '../services/libretv/sources.js'
import { fail, ok } from '../utils/response.js'
import { logger } from '../utils/logger.js'

export const vodRouter = Router()

vodRouter.get('/sources', (_req, res) => {
  ok(res, listSources(false))
})

const searchSchema = z.object({
  wd: z.string().min(1).max(100),
  sources: z.array(z.string()).optional(),
  filterAdult: z.boolean().optional(),
})

vodRouter.post('/search', async (req, res) => {
  const parsed = searchSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, '搜索参数无效')
  try {
    const data = await aggregateSearch(parsed.data)
    ok(res, data)
  } catch (err) {
    logger.error(err)
    fail(res, err instanceof Error ? err.message : '搜索失败', 1, 500)
  }
})

vodRouter.get('/detail', async (req, res) => {
  const source = String(req.query.source || '')
  const id = String(req.query.id || '')
  if (!source || !id) return fail(res, '缺少 source 或 id')
  try {
    const data = await fetchDetail(source, id)
    ok(res, data)
  } catch (err) {
    logger.error(err)
    fail(res, err instanceof Error ? err.message : '获取详情失败', 1, 500)
  }
})
