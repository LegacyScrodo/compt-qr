import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { pool } from '../db/pool'
import { verifyJWT, requireAdmin, AuthRequest } from '../middleware/auth'
import { publicLimiter } from '../middleware/rateLimiter'
import { Exposant } from '../types'
import { generateQrPdf } from '../services/pdf'
import { isImageMagicBytes } from '../services/imageValidation'

export const exposantsRouter = Router()

const uploadsDir = path.join(__dirname, '..', '..', 'uploads')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /image\/(jpeg|png|webp|gif)/.test(file.mimetype))
  },
})

// Champs retournés en vue publique (pas d'id interne)
const PUBLIC_FIELDS = `uuid, nom, entreprise, stand, email, telephone, site_web, description, logo_url, logo_file, statut`

// GET /api/exposants/:uuid — public (staff et visiteurs)
exposantsRouter.get('/:uuid([0-9a-f-]{36})', publicLimiter, async (req, res) => {
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

// GET /api/exposants/export/csv — admin
exposantsRouter.get('/export/csv', verifyJWT, requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT nom, entreprise, stand, email, telephone, site_web, description, statut, uuid FROM exposants ORDER BY nom ASC'
    )
    const escape = (v: unknown) => {
      if (v === null || v === undefined) return ''
      const s = String(v)
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const headers = ['nom', 'entreprise', 'stand', 'email', 'telephone', 'site_web', 'description', 'statut', 'uuid']
    const lines = [headers.join(',')]
    for (const row of result.rows) {
      lines.push(headers.map(h => escape(row[h])).join(','))
    }
    const csv = '﻿' + lines.join('\r\n') // BOM pour Excel
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="exposants.csv"')
    res.send(csv)
  } catch (err) {
    console.error('Export CSV error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/exposants/import-csv — admin (multipart/form-data, field "file")
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const ok = /text\/csv|application\/vnd\.ms-excel|text\/plain/.test(file.mimetype)
      || /\.csv$/i.test(file.originalname)
    cb(null, ok)
  },
})

exposantsRouter.post('/import-csv', verifyJWT, requireAdmin, csvUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier CSV requis' })
      return
    }
    const text = req.file.buffer.toString('utf8').replace(/^﻿/, '')
    const rows = parseCSV(text)
    if (rows.length === 0) {
      res.status(400).json({ error: 'CSV vide' })
      return
    }
    const header = rows[0].map(h => h.trim().toLowerCase())
    const colIdx = (name: string) => header.indexOf(name)

    const iNom = colIdx('nom')
    if (iNom === -1) {
      res.status(400).json({ error: 'Colonne "nom" obligatoire dans le CSV' })
      return
    }
    const iEntreprise = colIdx('entreprise')
    const iStand = colIdx('stand')
    const iEmail = colIdx('email')
    const iTelephone = colIdx('telephone')
    const iSiteWeb = colIdx('site_web')
    const iDescription = colIdx('description')
    const iStatut = colIdx('statut')

    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      if (row.length === 0 || (row.length === 1 && row[0] === '')) { skipped++; continue }
      const nom = (row[iNom] ?? '').trim()
      if (!nom) { skipped++; continue }
      const statut = iStatut >= 0 ? (row[iStatut] ?? '').trim().toLowerCase() : 'actif'
      const finalStatut = statut === 'inactif' ? 'inactif' : 'actif'

      try {
        await pool.query(
          `INSERT INTO exposants (nom, entreprise, stand, email, telephone, site_web, description, statut)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            nom,
            iEntreprise >= 0 ? (row[iEntreprise] ?? '').trim() || null : null,
            iStand >= 0 ? (row[iStand] ?? '').trim() || null : null,
            iEmail >= 0 ? (row[iEmail] ?? '').trim() || null : null,
            iTelephone >= 0 ? (row[iTelephone] ?? '').trim() || null : null,
            iSiteWeb >= 0 ? (row[iSiteWeb] ?? '').trim() || null : null,
            iDescription >= 0 ? (row[iDescription] ?? '').trim() || null : null,
            finalStatut,
          ]
        )
        inserted++
      } catch (e) {
        errors.push(`Ligne ${r + 1}: ${(e as Error).message}`)
      }
    }

    res.json({ inserted, skipped, errors })
  } catch (err) {
    console.error('Import CSV error:', err)
    res.status(500).json({ error: 'Erreur serveur lors de l\'import' })
  }
})

// Tiny CSV parser (supports quoted fields with "" escapes and commas inside quotes)
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { cur.push(field); field = '' }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = '' }
      else field += c
    }
  }
  // last field
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur) }
  return rows
}

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

// GET /api/exposants — admin (?limit=500&offset=0)
exposantsRouter.get('/', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '500'), 10) || 500, 1), 1000)
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0)
    const result = await pool.query(
      'SELECT * FROM exposants ORDER BY nom ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    )
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

// PUT /api/exposants/:id/position — admin
exposantsRouter.put('/:id(\\d+)/position', verifyJWT, requireAdmin, async (req, res) => {
  try {
    const { plan_id, pos_x, pos_y } = req.body as {
      plan_id?: number | null; pos_x?: number; pos_y?: number
    }

    if (plan_id === null || plan_id === undefined) {
      const result = await pool.query(
        'UPDATE exposants SET plan_id = NULL, pos_x = NULL, pos_y = NULL WHERE id = $1 RETURNING *',
        [req.params.id]
      )
      if (!result.rows[0]) { res.status(404).json({ error: 'Exposant introuvable' }); return }
      res.json(result.rows[0])
      return
    }

    if (typeof pos_x !== 'number' || typeof pos_y !== 'number' ||
        !Number.isFinite(pos_x) || !Number.isFinite(pos_y) ||
        pos_x < 0 || pos_x > 100 || pos_y < 0 || pos_y > 100) {
      res.status(400).json({ error: 'pos_x et pos_y doivent être entre 0 et 100' })
      return
    }

    const planExists = await pool.query('SELECT 1 FROM plans WHERE id = $1', [plan_id])
    if (!planExists.rows[0]) {
      res.status(400).json({ error: 'Plan inexistant' })
      return
    }

    const result = await pool.query(
      'UPDATE exposants SET plan_id = $1, pos_x = $2, pos_y = $3 WHERE id = $4 RETURNING *',
      [plan_id, pos_x, pos_y, req.params.id]
    )
    if (!result.rows[0]) { res.status(404).json({ error: 'Exposant introuvable' }); return }
    res.json(result.rows[0])
  } catch (err) {
    console.error('Update position error:', err)
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

    if (!isImageMagicBytes(req.file.buffer)) {
      res.status(400).json({ error: 'Type de fichier non valide' })
      return
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.bin'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    const destPath = path.join(uploadsDir, filename)
    fs.writeFileSync(destPath, req.file.buffer)

    const newLogoFile = `/uploads/${filename}`

    const current = await pool.query('SELECT logo_file FROM exposants WHERE id = $1', [req.params.id])
    if (!current.rows[0]) {
      fs.unlink(destPath, () => {})
      res.status(404).json({ error: 'Exposant introuvable' })
      return
    }

    const result = await pool.query(
      'UPDATE exposants SET logo_file = $1 WHERE id = $2 RETURNING *',
      [newLogoFile, req.params.id]
    )

    const oldLogoFile = current.rows[0].logo_file as string | null
    if (oldLogoFile) {
      fs.unlink(path.join(uploadsDir, path.basename(oldLogoFile)), (err) => {
        if (err) console.error('Old logo cleanup failed:', err)
      })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Upload logo error:', err)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
