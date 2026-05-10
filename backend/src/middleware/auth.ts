import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { User } from '../types'

export interface AuthRequest extends Request {
  user?: User
}

export function verifyJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const token = (req.cookies as Record<string, string>)?.access_token
  if (!token) {
    res.status(401).json({ error: 'Non authentifié' })
    return
  }
  try {
    req.user = jwt.verify(token, config.jwtSecret) as User
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: "Accès réservé à l'admin" })
    return
  }
  next()
}
