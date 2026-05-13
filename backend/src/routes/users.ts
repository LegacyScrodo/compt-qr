import { Router } from 'express'
import bcrypt from 'bcrypt'
import { pool } from '../db/pool'
import { verifyJWT, requireAdmin, AuthRequest } from '../middleware/auth'

export const usersRouter = Router()

// GET /api/users — admin
usersRouter.get('/', verifyJWT, requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, created_at FROM users ORDER BY created_at ASC'
    )
    res.json(result.rows)
  } catch (err) {
    console.error('List users error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/users — admin
usersRouter.post('/', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body as {
      email?: string; password?: string; role?: string
    }
    if (!email || !password || !role) {
      res.status(400).json({ error: 'Email, mot de passe et rôle sont obligatoires' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Email invalide' })
      return
    }
    if (!['admin', 'staff'].includes(role)) {
      res.status(400).json({ error: 'Rôle invalide' })
      return
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' })
      return
    }
    const hash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
      [email, hash, role]
    )
    res.status(201).json(result.rows[0])
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Cet email est déjà utilisé' })
      return
    }
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/users/:id — admin
usersRouter.put('/:id(\\d+)', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body as {
      email?: string; password?: string; role?: string
    }
    if (!email || !role) {
      res.status(400).json({ error: 'Email et rôle sont obligatoires' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Email invalide' })
      return
    }
    if (!['admin', 'staff'].includes(role)) {
      res.status(400).json({ error: 'Rôle invalide' })
      return
    }

    let result
    if (password) {
      if (password.length < 8) {
        res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' })
        return
      }
      const hash = await bcrypt.hash(password, 12)
      result = await pool.query(
        'UPDATE users SET email=$1, password=$2, role=$3 WHERE id=$4 RETURNING id, email, role, created_at',
        [email, hash, role, req.params.id]
      )
    } else {
      result = await pool.query(
        'UPDATE users SET email=$1, role=$2 WHERE id=$3 RETURNING id, email, role, created_at',
        [email, role, req.params.id]
      )
    }

    if (!result.rows[0]) {
      res.status(404).json({ error: 'Utilisateur introuvable' })
      return
    }
    res.json(result.rows[0])
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Cet email est déjà utilisé' })
      return
    }
    console.error('Update user error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/users/:id — admin (interdit de se supprimer soi-même)
usersRouter.delete('/:id(\\d+)', verifyJWT, requireAdmin, async (req: AuthRequest, res) => {
  try {
    if (req.user?.id === Number(req.params.id)) {
      res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' })
      return
    }
    const result = await pool.query(
      'DELETE FROM users WHERE id=$1 RETURNING id',
      [req.params.id]
    )
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Utilisateur introuvable' })
      return
    }
    res.status(204).send()
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
