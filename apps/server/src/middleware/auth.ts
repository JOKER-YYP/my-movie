import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { fail } from '../utils/response.js'

export interface AuthPayload {
  userId: string
  username: string
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

export function signToken(payload: AuthPayload): string {
  const secret = process.env.JWT_SECRET || 'dev-secret'
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return next()
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret'
    req.auth = jwt.verify(header.slice(7), secret) as AuthPayload
  } catch {
    // ignore
  }
  next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return fail(res, '未登录', 401, 401)
  }
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret'
    req.auth = jwt.verify(header.slice(7), secret) as AuthPayload
    next()
  } catch {
    return fail(res, '登录已失效', 401, 401)
  }
}
