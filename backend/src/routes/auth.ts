import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { pool } from '../db/pool'
import { config } from '../config'
import { authLimiter } from '../middleware/rateLimiter'
import { verifyJWT, AuthRequest } from '../middleware/auth'

export const authRouter = Router()

function setAccessCookie(res: import('express').Response, token: string, role: string) {
  const maxAge = role === 'admin'
    ? 24 * 60 * 60 * 1000
    : 8 * 60 * 60 * 1000

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge,
  })
}

authRouter.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body as { email: string; password: string }

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  const user = result.rows[0]

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    return
  }

  const expiresIn = user.role === 'admin' ? '24h' : '8h'
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn }
  )

  setAccessCookie(res, accessToken, user.role)

  // Refresh token uniquement pour l'admin
  if (user.role === 'admin') {
    const refreshToken = crypto.randomBytes(64).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    )
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
    })
  }

  res.json({ role: user.role, email: user.email })
})

authRouter.post('/logout', verifyJWT, async (req: AuthRequest, res) => {
  const refreshToken = (req.cookies as Record<string, string>)?.refresh_token
  if (refreshToken) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken])
  }
  res.clearCookie('access_token')
  res.clearCookie('refresh_token', { path: '/api/auth/refresh' })
  res.json({ ok: true })
})

authRouter.post('/refresh', async (req, res) => {
  const refreshToken = (req.cookies as Record<string, string>)?.refresh_token
  if (!refreshToken) {
    res.status(401).json({ error: 'Refresh token manquant' })
    return
  }

  const result = await pool.query(
    'SELECT rt.*, u.email, u.role FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token = $1 AND rt.expires_at > NOW()',
    [refreshToken]
  )
  const row = result.rows[0]
  if (!row) {
    res.status(401).json({ error: 'Refresh token invalide ou expiré' })
    return
  }

  const accessToken = jwt.sign(
    { id: row.user_id, email: row.email, role: row.role },
    config.jwtSecret,
    { expiresIn: '24h' }
  )
  setAccessCookie(res, accessToken, row.role)
  res.json({ ok: true })
})

authRouter.get('/me', verifyJWT, (req: AuthRequest, res) => {
  res.json(req.user)
})
