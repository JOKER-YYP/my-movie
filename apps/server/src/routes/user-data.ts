import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../utils/prisma.js'
import { fail, ok } from '../utils/response.js'

export const userDataRouter = Router()

userDataRouter.use(requireAuth)

const progressSchema = z.object({
  sourceKey: z.string().min(1),
  vodId: z.string().min(1),
  episodeIndex: z.number().int().min(0),
  positionSec: z.number().min(0),
  durationSec: z.number().min(0),
  title: z.string().min(1),
  cover: z.string().optional(),
})

userDataRouter.get('/progress', async (req, res) => {
  const sourceKey = String(req.query.sourceKey || '')
  const vodId = String(req.query.vodId || '')
  if (!sourceKey || !vodId) return fail(res, '缺少参数')
  const row = await prisma.watchProgress.findUnique({
    where: {
      userId_sourceKey_vodId: {
        userId: req.auth!.userId,
        sourceKey,
        vodId,
      },
    },
  })
  ok(res, row)
})

userDataRouter.put('/progress', async (req, res) => {
  const parsed = progressSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, '进度参数无效')
  const data = parsed.data
  const row = await prisma.watchProgress.upsert({
    where: {
      userId_sourceKey_vodId: {
        userId: req.auth!.userId,
        sourceKey: data.sourceKey,
        vodId: data.vodId,
      },
    },
    create: { userId: req.auth!.userId, ...data },
    update: {
      episodeIndex: data.episodeIndex,
      positionSec: data.positionSec,
      durationSec: data.durationSec,
      title: data.title,
      cover: data.cover,
    },
  })
  ok(res, row)
})

userDataRouter.get('/history', async (req, res) => {
  const list = await prisma.watchProgress.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })
  ok(res, list)
})

const favSchema = z.object({
  sourceKey: z.string().min(1),
  vodId: z.string().min(1),
  title: z.string().min(1),
  cover: z.string().optional(),
})

userDataRouter.get('/favorites', async (req, res) => {
  const list = await prisma.favorite.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: 'desc' },
  })
  ok(res, list)
})

userDataRouter.post('/favorites', async (req, res) => {
  const parsed = favSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, '收藏参数无效')
  const data = parsed.data
  const row = await prisma.favorite.upsert({
    where: {
      userId_sourceKey_vodId: {
        userId: req.auth!.userId,
        sourceKey: data.sourceKey,
        vodId: data.vodId,
      },
    },
    create: { userId: req.auth!.userId, ...data },
    update: { title: data.title, cover: data.cover },
  })
  ok(res, row)
})

userDataRouter.delete('/favorites', async (req, res) => {
  const sourceKey = String(req.query.sourceKey || '')
  const vodId = String(req.query.vodId || '')
  if (!sourceKey || !vodId) return fail(res, '缺少参数')
  await prisma.favorite.deleteMany({
    where: { userId: req.auth!.userId, sourceKey, vodId },
  })
  ok(res, true)
})
