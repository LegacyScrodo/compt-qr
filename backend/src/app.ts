import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { authRouter } from './routes/auth'
import { exposantsRouter } from './routes/exposants'
import { config } from './config'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({
    origin: config.nodeEnv === 'production' ? config.baseUrl : true,
    credentials: true,
  }))
  app.use(express.json())
  app.use(cookieParser())
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

  app.use('/api/auth', authRouter)
  app.use('/api/exposants', exposantsRouter)

  app.use((_req, res) => res.status(404).json({ error: 'Route introuvable' }))

  return app
}
