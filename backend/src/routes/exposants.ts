import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { pool } from '../db/pool'
import { verifyJWT, requireAdmin, AuthRequest } from '../middleware/auth'
import { Exposant } from '../types'
import { generateQrPdf } from '../services/pdf'

export const exposantsRouter = Router()

const uploadsDir = path.join(__dirname, '..', '..', 'uploads')
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    cb(null, /image\/(jpeg|png|webp|gif)/.test(file.mimetype))
  },
})

// Champs retournés en vue publique (pas d'id interne)
const PUBLIC_FIELDS = `uuid, nom, entreprise, stand, email, telephone, site_web, description, logo_url, logo_file, statut`

// GET /api/exposants/:uuid — public (staff et visiteurs)
exposantsRouter.get('/:uuid([0-9a-f-]{36})', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM exposants WHERE uuid = $1`,
      [req.params.uuid]
    )
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Exposant introuvable' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('GET exposant error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/exposants/export/pdf — admin (must be before /:id routes)
exposantsRouter.get('/export/pdf', verifyJWT, requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM exposants WHERE statut = $1 ORDER BY stand ASC',
      ['actif']
    )
    const pdfBuffer = await generateQrPdf(result.rows as Exposant[])
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="compt-qr-badges.pdf"')
    res.send(pdfBuffer)
  } catch (err) {
    console.error('Export PDF error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/exposants/:id — admin (par ID numérique)
exposantsRouter.get('/:id(\\d+)', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM exposants WHERE id = $1',
      [req.params.id]
    )
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Exposant introuvable' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('GET exposant by id error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/exposants — admin
exposantsRouter.get('/', verifyJWT, requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM exposants ORDER BY nom ASC')
    res.json(result.rows)
  } catch (err) {
    console.error('List exposants error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/exposants — admin
exposantsRouter.post('/', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const { nom, entreprise, stand, email, telephone, site_web, description, logo_url, statut } = req.body as Partial<Exposant>
    if (!nom) {
      res.status(400).json({ error: 'Le champ nom est obligatoire' })
      return
    }
    const result = await pool.query(
      `INSERT INTO exposants (nom, entreprise, stand, email, telephone, site_web, description, logo_url, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [nom, entreprise ?? null, stand ?? null, email ?? null, telephone ?? null, site_web ?? null, description ?? null, logo_url ?? null, statut ?? 'actif']
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Create exposant error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/exposants/:id — admin
exposantsRouter.put('/:id(\\d+)', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const { nom, entreprise, stand, email, telephone, site_web, description, logo_url, statut } = req.body as Partial<Exposant>
    if (!nom) {
      res.status(400).json({ error: 'Le champ nom est obligatoire' })
      return
    }
    const result = await pool.query(
      `UPDATE exposants SET nom=$1, entreprise=$2, stand=$3, email=$4, telephone=$5,
       site_web=$6, description=$7, logo_url=$8, statut=$9 WHERE id=$10 RETURNING *`,
      [nom, entreprise ?? null, stand ?? null, email ?? null, telephone ?? null, site_web ?? null, description ?? null, logo_url ?? null, statut ?? 'actif', req.params.id]
    )
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Exposant introuvable' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('Update exposant error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DELETE /api/exposants/:id — admin
exposantsRouter.delete('/:id(\\d+)', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM exposants WHERE id = $1 RETURNING logo_file',
      [req.params.id]
    )
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Exposant introuvable' })
      return
    }
    const logoFile = result.rows[0].logo_file as string | null
    if (logoFile) {
      fs.unlink(path.join(uploadsDir, path.basename(logoFile)), (err) => {
        if (err) console.error('Logo file cleanup failed:', err)
      })
    }
    res.status(204).send()
  } catch (err) {
    console.error('Delete exposant error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/exposants/:id/logo — admin
exposantsRouter.post('/:id(\\d+)/logo', verifyJWT, requireAdmin, upload.single('logo'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier image requis (jpeg, png, webp, gif, max 5 MB)' })
      return
    }
    const newLogoFile = `/uploads/${req.file.filename}`

    // Fetch old logo before updating so we can clean it up
    const current = await pool.query('SELECT logo_file FROM exposants WHERE id = $1', [req.params.id])
    if (!current.rows[0]) {
      fs.unlink(path.join(uploadsDir, req.file.filename), () => {})
      res.status(404).json({ error: 'Exposant introuvable' })
      return
    }

    const result = await pool.query(
      'UPDATE exposants SET logo_file = $1 WHERE id = $2 RETURNING *',
      [newLogoFile, req.params.id]
    )

    // Delete old logo file if it existed
    const oldLogoFile = current.rows[0].logo_file as string | null
    if (oldLogoFile) {
      fs.unlink(path.join(uploadsDir, path.basename(oldLogoFile)), (err) => {
        if (err) console.error('Old logo cleanup failed:', err)
      })
    }

    res.json(result.rows[0])
  } catch (err) {
    // Clean up uploaded file on any error
    if (req.file) {
      fs.unlink(path.join(uploadsDir, req.file.filename), () => {})
    }
    console.error('Upload logo error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
