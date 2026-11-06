import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../utils/prisma.js'
import { fail, ok } from '../utils/response.js'
import { requireAuth, signToken } from '../middleware/auth.js'

export const authRouter = Router()

const credSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(64),
})

authRouter.post('/register', async (req, res) => {
  const parsed = credSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, '用户名或密码格式不正确')
  const { username, password } = parsed.data
  const exists = await prisma.user.findUnique({ where: { username } })
  if (exists) return fail(res, '用户名已存在')
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username, passwordHash, nickname: username },
  })
  const token = signToken({ userId: user.id, username: user.username })
  ok(res, {
    token,
    user: { id: user.id, username: user.username, nickname: user.nickname },
  })
})

authRouter.post('/login', async (req, res) => {
  const parsed = credSchema.safeParse(req.body)
  if (!parsed.success) return fail(res, '用户名或密码格式不正确')
  const { username, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) return fail(res, '用户名或密码错误', 1, 401)
  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) return fail(res, '用户名或密码错误', 1, 401)
  const token = signToken({ userId: user.id, username: user.username })
  ok(res, {
    token,
    user: { id: user.id, username: user.username, nickname: user.nickname },
  })
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } })
  if (!user) return fail(res, '用户不存在', 1, 404)
  ok(res, { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar })
})
