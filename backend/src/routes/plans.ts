import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { pool } from '../db/pool'
import { verifyJWT, requireAdmin } from '../middleware/auth'
import { publicLimiter } from '../middleware/rateLimiter'
import { isImageMagicBytes } from '../services/imageValidation'

export const plansRouter = Router()

const plansUploadsDir = path.join(__dirname, '..', '..', 'uploads', 'plans')
fs.mkdirSync(plansUploadsDir, { recursive: true })

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /image\/(jpeg|png|webp|gif)/.test(file.mimetype))
  },
})

function writePlanImage(buffer: Buffer, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || '.bin'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  fs.writeFileSync(path.join(plansUploadsDir, filename), buffer)
  return `/uploads/plans/${filename}`
}

function deletePlanImage(imageFile: string | null) {
  if (!imageFile) return
  const file = path.join(plansUploadsDir, path.basename(imageFile))
  try { fs.unlinkSync(file) } catch (_) { /* ignore if already gone */ }
}

plansRouter.get('/', publicLimiter, async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nom, image_file, ordre FROM plans ORDER BY ordre ASC, nom ASC'
    )
    res.json(result.rows)
  } catch (err) {
    console.error('List plans error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

plansRouter.get('/:id(\\d+)', publicLimiter, async (req, res) => {
  try {
    const plan = await pool.query(
      'SELECT id, nom, image_file, ordre FROM plans WHERE id = $1',
      [req.params.id]
    )
    if (!plan.rows[0]) { res.status(404).json({ error: 'Plan introuvable' }); return }

    const exposants = await pool.query(
      `SELECT id, uuid, nom, entreprise, stand, statut, pos_x, pos_y
       FROM exposants
       WHERE plan_id = $1 AND pos_x IS NOT NULL AND pos_y IS NOT NULL
       ORDER BY stand ASC`,
      [req.params.id]
    )
    res.json({ ...plan.rows[0], exposants: exposants.rows })
  } catch (err) {
    console.error('Get plan error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

plansRouter.post('/', verifyJWT, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { nom } = req.body as { nom?: string }
    if (!nom || !nom.trim()) { res.status(400).json({ error: 'Nom requis' }); return }
    if (!req.file) { res.status(400).json({ error: 'Image requise' }); return }
    if (!isImageMagicBytes(req.file.buffer)) {
      res.status(400).json({ error: 'Type de fichier non valide' })
      return
    }

    const imagePath = writePlanImage(req.file.buffer, req.file.originalname)
    try {
      const result = await pool.query(
        'INSERT INTO plans (nom, image_file) VALUES ($1, $2) RETURNING *',
        [nom.trim(), imagePath]
      )
      res.status(201).json(result.rows[0])
    } catch (dbErr) {
      deletePlanImage(imagePath)
      throw dbErr
    }
  } catch (err) {
    console.error('Create plan error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

plansRouter.put('/:id(\\d+)', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const { nom, ordre } = req.body as { nom?: string; ordre?: number }
    if (!nom || !nom.trim()) { res.status(400).json({ error: 'Nom requis' }); return }
    const ordreVal = typeof ordre === 'number' ? ordre : 0

    const result = await pool.query(
      'UPDATE plans SET nom = $1, ordre = $2 WHERE id = $3 RETURNING *',
      [nom.trim(), ordreVal, req.params.id]
    )
    if (!result.rows[0]) { res.status(404).json({ error: 'Plan introuvable' }); return }
    res.json(result.rows[0])
  } catch (err) {
    console.error('Update plan error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

plansRouter.post('/:id(\\d+)/image', verifyJWT, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Image requise' }); return }
    if (!isImageMagicBytes(req.file.buffer)) {
      res.status(400).json({ error: 'Type de fichier non valide' })
      return
    }

    const current = await pool.query('SELECT image_file FROM plans WHERE id = $1', [req.params.id])
    if (!current.rows[0]) { res.status(404).json({ error: 'Plan introuvable' }); return }

    const newImagePath = writePlanImage(req.file.buffer, req.file.originalname)
    const result = await pool.query(
      'UPDATE plans SET image_file = $1 WHERE id = $2 RETURNING *',
      [newImagePath, req.params.id]
    )
    deletePlanImage(current.rows[0].image_file)
    res.json(result.rows[0])
  } catch (err) {
    console.error('Update plan image error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

plansRouter.delete('/:id(\\d+)', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM plans WHERE id = $1 RETURNING image_file',
      [req.params.id]
    )
    if (!result.rows[0]) { res.status(404).json({ error: 'Plan introuvable' }); return }
    deletePlanImage(result.rows[0].image_file)
    res.status(204).send()
  } catch (err) {
    console.error('Delete plan error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
