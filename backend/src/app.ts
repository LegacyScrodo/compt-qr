import express, { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { authRouter } from './routes/auth'
import { exposantsRouter } from './routes/exposants'
import { usersRouter } from './routes/users'
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
  app.use('/api/users', usersRouter)

  app.use((_req, res) => res.status(404).json({ error: 'Route introuvable' }))

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Erreur serveur interne' })
  })

  return app
}
