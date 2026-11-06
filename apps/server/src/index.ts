import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { healthRouter } from './routes/health.js'
import { authRouter } from './routes/auth.js'
import { vodRouter } from './routes/vod.js'
import { proxyRouter } from './routes/proxy.js'
import { userDataRouter } from './routes/user-data.js'
import { panRouter } from './routes/pan.js'
import { logger } from './utils/logger.js'

const app = express()
const port = Number(process.env.PORT || 3000)

app.use(
  cors({
    origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN?.split(',') || true,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.use('/api', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/vod', vodRouter)
app.use('/api/proxy', proxyRouter)
app.use('/api/pan', panRouter)
app.use('/api', userDataRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err)
  res.status(500).json({ code: 1, message: '服务器错误', data: null })
})

app.listen(port, () => {
  logger.info(`my-movie server listening on http://127.0.0.1:${port}`)
})
