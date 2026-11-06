import { Router } from 'express'
import { z } from 'zod'
import {
  fetchXiaGeBaDetail,
  fetchXiaGeBaShareUrl,
  parseVideoFilesFromMenu,
  searchXiaGeBaSources,
} from '../services/pan/xiageba.js'
import { fail, ok } from '../utils/response.js'
import { logger } from '../utils/logger.js'

export const panRouter = Router()

panRouter.get('/search', async (req, res) => {
  const wd = String(req.query.q || req.query.wd || '').trim()
  const page = Number(req.query.page || 1)
  const pageSize = Number(req.query.pageSize || 20)
  if (!wd) return fail(res, '缺少关键词')
  try {
    const list = await searchXiaGeBaSources(wd, page, pageSize)
    ok(res, { list })
  } catch (err) {
    logger.error(err)
    fail(res, err instanceof Error ? err.message : '网盘搜索失败', 1, 500)
  }
})

panRouter.get('/detail', async (req, res) => {
  const id = String(req.query.id || '').trim()
  if (!id) return fail(res, '缺少 id')
  try {
    const detail = await fetchXiaGeBaDetail(id)
    const videos = parseVideoFilesFromMenu(detail.menu)
    ok(res, { ...detail, videos })
  } catch (err) {
    logger.error(err)
    fail(res, err instanceof Error ? err.message : '获取详情失败', 1, 500)
  }
})

const urlSchema = z.object({ id: z.string().min(1) })

panRouter.post('/share-url', async (req, res) => {
  const parsed = urlSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, '缺少 id')
  try {
    const url = await fetchXiaGeBaShareUrl(parsed.data.id)
    ok(res, { url })
  } catch (err) {
    logger.error(err)
    fail(res, err instanceof Error ? err.message : '获取分享链接失败', 1, 500)
  }
})
