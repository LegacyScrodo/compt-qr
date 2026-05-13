# Plan interactif des exposants — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre aux visiteurs de localiser visuellement les exposants sur un plan multi-images de l'événement, et à l'admin de placer les exposants sur ces plans via une interface dédiée.

**Architecture:** Une table `plans` héberge les images uploadées (PNG/JPG validés magic-bytes) et l'ordre d'affichage. Les exposants gagnent les colonnes `plan_id`, `pos_x`, `pos_y` (% relatifs à l'image). Côté frontend, un composant `PlanCanvas` réutilisable affiche image + marqueurs en mode `view` (public) ou `edit` (admin, drag pour repositionner). La vue publique est mobile-first avec `react-zoom-pan-pinch` pour le pinch-to-zoom et un drawer mobile pour la fiche exposant.

**Tech Stack:** TypeScript, Express + pg + multer (backend), React + react-router-dom + react-zoom-pan-pinch + Tailwind (frontend), Jest/supertest + Vitest/@testing-library (tests).

**Spec source:** `docs/superpowers/specs/2026-05-13-plan-interactif-design.md`

---

## File Structure

### Backend

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `backend/src/db/migrations/002_plans.sql` | Create | Table `plans` + colonnes `plan_id/pos_x/pos_y` sur `exposants` |
| `backend/src/types.ts` | Modify | Ajouter `Plan`, étendre `Exposant` |
| `backend/src/services/imageValidation.ts` | Create | Factorisation de `isImageMagicBytes` |
| `backend/src/routes/exposants.ts` | Modify | Utiliser le service partagé + nouvelle route `PUT /:id/position` |
| `backend/src/routes/plans.ts` | Create | CRUD plans + upload image |
| `backend/src/app.ts` | Modify | Monter `plansRouter` + servir `/uploads/plans` static |
| `backend/tests/plans.test.ts` | Create | Tests intégration |
| `backend/tests/position.test.ts` | Create | Tests endpoint position |

### Frontend

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `frontend/package.json` | Modify | Dépendance `react-zoom-pan-pinch` |
| `frontend/src/types.ts` | Modify | Ajouter `Plan`, étendre `Exposant` |
| `frontend/src/api.ts` | Modify | Ajouter `api.plans.*` + `api.exposants.setPosition` |
| `frontend/src/components/PlanMarker.tsx` | Create | Pastille avec n° stand, états (actif/inactif/highlight) |
| `frontend/src/components/PlanCanvas.tsx` | Create | Image + marqueurs absolus, zoom/pan, mode view/edit |
| `frontend/src/components/PlanExposantDrawer.tsx` | Create | Drawer mobile mini-fiche exposant |
| `frontend/src/components/PlanEditorSidebar.tsx` | Create | Sidebar "À placer / Sur ce plan" |
| `frontend/src/pages/public/PlanView.tsx` | Create | Route `/plan` (+ `?highlight=:uuid`) |
| `frontend/src/pages/admin/PlanList.tsx` | Create | Route `/admin/plans` (CRUD haut niveau) |
| `frontend/src/pages/admin/PlanEditor.tsx` | Create | Route `/admin/plans/:id` (éditeur visuel) |
| `frontend/src/pages/admin/AdminLayout.tsx` | Modify | Lien nav "Plans" |
| `frontend/src/pages/public/PublicCard.tsx` | Modify | Bouton "Voir sur le plan" si placé |
| `frontend/src/App.tsx` | Modify | Routes `/plan`, `/admin/plans`, `/admin/plans/:id` |

---

## Task 1: Migration DB

**Files:**
- Create: `backend/src/db/migrations/002_plans.sql`

- [ ] **Step 1: Écrire le fichier de migration**

```sql
-- backend/src/db/migrations/002_plans.sql

CREATE TABLE IF NOT EXISTS plans (
  id          SERIAL PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  image_file  VARCHAR(255) NOT NULL,
  ordre       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

DROP TRIGGER IF EXISTS plans_updated_at ON plans;
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE exposants
  ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_x   DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS pos_y   DECIMAL(5,2);

ALTER TABLE exposants DROP CONSTRAINT IF EXISTS exposants_pos_x_check;
ALTER TABLE exposants DROP CONSTRAINT IF EXISTS exposants_pos_y_check;
ALTER TABLE exposants
  ADD CONSTRAINT exposants_pos_x_check CHECK (pos_x IS NULL OR (pos_x >= 0 AND pos_x <= 100)),
  ADD CONSTRAINT exposants_pos_y_check CHECK (pos_y IS NULL OR (pos_y >= 0 AND pos_y <= 100));
```

- [ ] **Step 2: Appliquer la migration en local**

```bash
sudo -u postgres psql -d comptqr -f backend/src/db/migrations/002_plans.sql
```

Expected output:
```
CREATE TABLE
DROP TRIGGER
CREATE TRIGGER
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
```

- [ ] **Step 3: Vérifier le schéma**

```bash
sudo -u postgres psql -d comptqr -c "\d plans" && \
sudo -u postgres psql -d comptqr -c "\d exposants" | grep -E "plan_id|pos_x|pos_y"
```

Expected: la table `plans` existe, et la table `exposants` contient bien `plan_id`, `pos_x`, `pos_y`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/migrations/002_plans.sql
git commit -m "feat(db): migration plans + colonnes position sur exposants"
```

---

## Task 2: Types backend

**Files:**
- Modify: `backend/src/types.ts`

- [ ] **Step 1: Ajouter l'interface Plan et étendre Exposant**

Remplacer le contenu actuel de `backend/src/types.ts` par :

```typescript
export interface Exposant {
  id: number
  uuid: string
  nom: string
  entreprise: string | null
  stand: string | null
  email: string | null
  telephone: string | null
  site_web: string | null
  description: string | null
  logo_url: string | null
  logo_file: string | null
  statut: 'actif' | 'inactif'
  plan_id: number | null
  pos_x: number | null
  pos_y: number | null
  created_at: Date
  updated_at: Date
}

export interface Plan {
  id: number
  nom: string
  image_file: string
  ordre: number
  created_at: Date
  updated_at: Date
}

export interface User {
  id: number
  email: string
  role: 'admin' | 'staff'
}
```

- [ ] **Step 2: Vérifier que ça compile**

```bash
cd backend && npx tsc --noEmit
```

Expected: 0 erreur (sauf l'erreur pré-existante de `pdf.ts` qu'on a déjà corrigée — vérifie qu'aucune nouvelle erreur n'apparait).

- [ ] **Step 3: Commit**

```bash
git add backend/src/types.ts
git commit -m "feat(types): ajoute Plan et étend Exposant avec plan_id/pos_x/pos_y"
```

---

## Task 3: Service de validation d'image

**Files:**
- Create: `backend/src/services/imageValidation.ts`
- Modify: `backend/src/routes/exposants.ts`

- [ ] **Step 1: Créer le service partagé**

```typescript
// backend/src/services/imageValidation.ts

// Validates image magic bytes — MIME headers from the client cannot be trusted
export function isImageMagicBytes(buf: Buffer): boolean {
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true // PNG
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true // GIF
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true // WebP
  return false
}
```

- [ ] **Step 2: Refactorer `exposants.ts` pour utiliser le service**

Dans `backend/src/routes/exposants.ts`, remplacer la déclaration locale `function isImageMagicBytes` (et son commentaire au-dessus) par un import en haut du fichier :

```typescript
import { isImageMagicBytes } from '../services/imageValidation'
```

Supprime le bloc :

```typescript
// Validates image magic bytes — MIME headers from the client cannot be trusted
function isImageMagicBytes(buf: Buffer): boolean {
  // ... tout le corps
}
```

- [ ] **Step 3: Vérifier que ça compile et que les tests passent toujours**

```bash
cd backend && npx tsc --noEmit && npm test -- exposants.test.ts
```

Expected: tests verts comme avant.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/imageValidation.ts backend/src/routes/exposants.ts
git commit -m "refactor: extrait isImageMagicBytes dans services/imageValidation"
```

---

## Task 4: Endpoint position sur exposants

**Files:**
- Modify: `backend/src/routes/exposants.ts`
- Create: `backend/tests/position.test.ts`

- [ ] **Step 1: Écrire les tests failing**

Créer `backend/tests/position.test.ts` :

```typescript
import request from 'supertest'
import { createApp } from '../src/app'

const app = createApp()

async function loginAsAdmin() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@comptoir.ch', password: 'admin2027' })
  return res.headers['set-cookie'] as unknown as string[]
}

describe('PUT /api/exposants/:id/position', () => {
  let cookie: string[]
  let exposantId: number
  let planId: number

  beforeAll(async () => {
    cookie = await loginAsAdmin()
    const list = await request(app).get('/api/exposants').set('Cookie', cookie)
    exposantId = list.body[0].id

    const created = await request(app)
      .post('/api/plans')
      .set('Cookie', cookie)
      .field('nom', 'Test Plan Position')
      .attach('image', Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]), 'p.png')
    planId = created.body.id
  })

  afterAll(async () => {
    await request(app).delete(`/api/plans/${planId}`).set('Cookie', cookie)
  })

  it('place un exposant à des coordonnées valides', async () => {
    const res = await request(app)
      .put(`/api/exposants/${exposantId}/position`)
      .set('Cookie', cookie)
      .send({ plan_id: planId, pos_x: 42.5, pos_y: 67.8 })
    expect(res.status).toBe(200)
    expect(Number(res.body.pos_x)).toBeCloseTo(42.5)
    expect(Number(res.body.pos_y)).toBeCloseTo(67.8)
    expect(res.body.plan_id).toBe(planId)
  })

  it('détache un exposant avec plan_id null', async () => {
    const res = await request(app)
      .put(`/api/exposants/${exposantId}/position`)
      .set('Cookie', cookie)
      .send({ plan_id: null })
    expect(res.status).toBe(200)
    expect(res.body.plan_id).toBeNull()
    expect(res.body.pos_x).toBeNull()
    expect(res.body.pos_y).toBeNull()
  })

  it('refuse une coordonnée hors borne', async () => {
    const res = await request(app)
      .put(`/api/exposants/${exposantId}/position`)
      .set('Cookie', cookie)
      .send({ plan_id: planId, pos_x: 150, pos_y: 50 })
    expect(res.status).toBe(400)
  })

  it('refuse un plan_id inexistant', async () => {
    const res = await request(app)
      .put(`/api/exposants/${exposantId}/position`)
      .set('Cookie', cookie)
      .send({ plan_id: 999999, pos_x: 50, pos_y: 50 })
    expect(res.status).toBe(400)
  })

  it('retourne 401 sans auth', async () => {
    const res = await request(app)
      .put(`/api/exposants/${exposantId}/position`)
      .send({ plan_id: null })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Lancer les tests pour confirmer qu'ils échouent**

```bash
cd backend && npm test -- position.test.ts
```

Expected: échec, les routes `/position` et `POST /api/plans` n'existent pas encore.

- [ ] **Step 3: Implémenter le endpoint dans `exposants.ts`**

Dans `backend/src/routes/exposants.ts`, ajouter avant la route `POST /api/exposants/:id(\\d+)/logo` :

```typescript
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
```

Note : ce test ne peut passer entièrement qu'une fois `POST /api/plans` implémenté (Task 5). On le laissera failer sur le `beforeAll` jusque-là.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/exposants.ts backend/tests/position.test.ts
git commit -m "feat(api): PUT /api/exposants/:id/position pour placer/détacher"
```

---

## Task 5: Router plans (CRUD + upload)

**Files:**
- Create: `backend/src/routes/plans.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/tests/plans.test.ts`

- [ ] **Step 1: Écrire les tests failing**

```typescript
// backend/tests/plans.test.ts
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import { createApp } from '../src/app'

const app = createApp()

// PNG 1x1 valide (8-byte signature + bare minimum)
const PNG_1x1 = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
  0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54,
  0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
  0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00,
  0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
])

async function loginAsAdmin() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@comptoir.ch', password: 'admin2027' })
  return res.headers['set-cookie'] as unknown as string[]
}

describe('Plans CRUD', () => {
  let cookie: string[]
  let createdId: number

  beforeAll(async () => { cookie = await loginAsAdmin() })

  afterAll(async () => {
    if (createdId) {
      await request(app).delete(`/api/plans/${createdId}`).set('Cookie', cookie)
    }
  })

  it('POST /api/plans crée un plan avec image valide', async () => {
    const res = await request(app)
      .post('/api/plans')
      .set('Cookie', cookie)
      .field('nom', 'Halle test')
      .attach('image', PNG_1x1, 'plan.png')
    expect(res.status).toBe(201)
    expect(res.body.nom).toBe('Halle test')
    expect(res.body.image_file).toMatch(/^\/uploads\/plans\//)
    createdId = res.body.id
  })

  it('POST /api/plans rejette une non-image', async () => {
    const res = await request(app)
      .post('/api/plans')
      .set('Cookie', cookie)
      .field('nom', 'Pas image')
      .attach('image', Buffer.from('Hello world, not an image'), 'fake.png')
    expect(res.status).toBe(400)
  })

  it('POST /api/plans rejette sans auth', async () => {
    const res = await request(app)
      .post('/api/plans')
      .field('nom', 'X')
      .attach('image', PNG_1x1, 'p.png')
    expect(res.status).toBe(401)
  })

  it('GET /api/plans liste les plans (public)', async () => {
    const res = await request(app).get('/api/plans')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some((p: { id: number }) => p.id === createdId)).toBe(true)
  })

  it('GET /api/plans/:id retourne plan + exposants placés', async () => {
    const res = await request(app).get(`/api/plans/${createdId}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(createdId)
    expect(Array.isArray(res.body.exposants)).toBe(true)
  })

  it('PUT /api/plans/:id renomme et change ordre', async () => {
    const res = await request(app)
      .put(`/api/plans/${createdId}`)
      .set('Cookie', cookie)
      .send({ nom: 'Halle renommée', ordre: 5 })
    expect(res.status).toBe(200)
    expect(res.body.nom).toBe('Halle renommée')
    expect(res.body.ordre).toBe(5)
  })

  it('POST /api/plans/:id/image remplace l\'image et supprime l\'ancienne', async () => {
    const before = await request(app).get(`/api/plans/${createdId}`)
    const oldFile = before.body.image_file
    const oldDiskPath = path.join(__dirname, '..', 'uploads', 'plans', path.basename(oldFile))

    const res = await request(app)
      .post(`/api/plans/${createdId}/image`)
      .set('Cookie', cookie)
      .attach('image', PNG_1x1, 'new.png')
    expect(res.status).toBe(200)
    expect(res.body.image_file).not.toBe(oldFile)
    // L'ancien fichier doit avoir disparu
    expect(fs.existsSync(oldDiskPath)).toBe(false)
  })

  it('DELETE /api/plans/:id supprime le plan et détache les exposants', async () => {
    // Crée un plan + place un exposant dessus pour vérifier le SET NULL
    const planRes = await request(app)
      .post('/api/plans')
      .set('Cookie', cookie)
      .field('nom', 'Plan à supprimer')
      .attach('image', PNG_1x1, 'p.png')
    const tempId = planRes.body.id

    const expRes = await request(app).get('/api/exposants').set('Cookie', cookie)
    const expId = expRes.body[0].id

    await request(app)
      .put(`/api/exposants/${expId}/position`)
      .set('Cookie', cookie)
      .send({ plan_id: tempId, pos_x: 10, pos_y: 20 })

    const del = await request(app).delete(`/api/plans/${tempId}`).set('Cookie', cookie)
    expect(del.status).toBe(204)

    const after = await request(app).get(`/api/exposants/${expId}`).set('Cookie', cookie)
    expect(after.body.plan_id).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer les tests pour confirmer l'échec**

```bash
cd backend && npm test -- plans.test.ts
```

Expected: tous les tests échouent (404 / route manquante).

- [ ] **Step 3: Créer le router**

```typescript
// backend/src/routes/plans.ts
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
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
  fs.unlink(file, () => {})
}

// GET /api/plans — public
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

// GET /api/plans/:id — public (plan + exposants placés)
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

// POST /api/plans — admin (multipart: nom + image)
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

// PUT /api/plans/:id — admin (nom et/ou ordre)
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

// POST /api/plans/:id/image — admin (remplace l'image)
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

// DELETE /api/plans/:id — admin
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
```

- [ ] **Step 4: Monter le router et servir `/uploads/plans` static dans `app.ts`**

Dans `backend/src/app.ts`, ajouter en haut :

```typescript
import { plansRouter } from './routes/plans'
```

Et avant `app.use((_req, res) => res.status(404)...)` :

```typescript
app.use('/api/plans', plansRouter)
```

Note : le static handler `app.use('/uploads', express.static(...))` couvre déjà `/uploads/plans/*` automatiquement, pas besoin de l'ajouter séparément.

- [ ] **Step 5: Relancer les tests pour vérifier qu'ils passent**

```bash
cd backend && npm test -- plans.test.ts position.test.ts
```

Expected: tous verts (y compris les tests de Task 4 qui dépendaient de `POST /api/plans`).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/plans.ts backend/src/app.ts backend/tests/plans.test.ts
git commit -m "feat(api): CRUD plans + upload image avec validation magic bytes"
```

---

## Task 6: Types et API client frontend

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api.ts`

- [ ] **Step 1: Étendre les types**

Remplacer le contenu de `frontend/src/types.ts` par :

```typescript
export interface Exposant {
  id?: number
  uuid: string
  nom: string
  entreprise: string | null
  stand: string | null
  email: string | null
  telephone: string | null
  site_web: string | null
  description: string | null
  logo_url: string | null
  logo_file: string | null
  statut: 'actif' | 'inactif'
  plan_id?: number | null
  pos_x?: number | null
  pos_y?: number | null
}

export interface Plan {
  id: number
  nom: string
  image_file: string
  ordre: number
}

export interface PlanWithExposants extends Plan {
  exposants: Array<Pick<Exposant, 'id' | 'uuid' | 'nom' | 'entreprise' | 'stand' | 'statut' | 'pos_x' | 'pos_y'>>
}

export interface AuthUser {
  id: number
  email: string
  role: 'admin' | 'staff'
}

export interface UserProfile {
  id: number
  email: string
  role: 'admin' | 'staff'
  created_at: string
}
```

- [ ] **Step 2: Ajouter les endpoints API**

Dans `frontend/src/api.ts`, ajouter en haut :

```typescript
import type { Exposant, AuthUser, UserProfile, Plan, PlanWithExposants } from './types'
```

(Remplace la ligne d'import existante.)

Dans l'objet `api`, ajouter une section `plans` et étendre `exposants` :

```typescript
export const api = {
  // ... auth, users inchangés ...
  exposants: {
    // ... toutes les méthodes existantes ...
    setPosition: (id: number, data: { plan_id: number; pos_x: number; pos_y: number } | { plan_id: null }) =>
      req<Exposant>(`/api/exposants/${id}/position`, {
        method: 'PUT', body: JSON.stringify(data),
      }),
  },
  plans: {
    list: () => req<Plan[]>('/api/plans'),
    get: (id: number) => req<PlanWithExposants>(`/api/plans/${id}`),
    create: (nom: string, image: File) => {
      const form = new FormData()
      form.append('nom', nom)
      form.append('image', image)
      return req<Plan>('/api/plans', { method: 'POST', body: form })
    },
    update: (id: number, data: { nom: string; ordre?: number }) =>
      req<Plan>(`/api/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    replaceImage: (id: number, image: File) => {
      const form = new FormData()
      form.append('image', image)
      return req<Plan>(`/api/plans/${id}/image`, { method: 'POST', body: form })
    },
    delete: (id: number) =>
      req<void>(`/api/plans/${id}`, { method: 'DELETE' }),
  },
}
```

- [ ] **Step 3: Vérifier que ça compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/api.ts
git commit -m "feat(api): types Plan + endpoints api.plans côté frontend"
```

---

## Task 7: Installer react-zoom-pan-pinch

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Installer la dépendance**

```bash
cd frontend && npm install react-zoom-pan-pinch
```

Expected: installé sans warning bloquant.

- [ ] **Step 2: Vérifier le type**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: ajoute react-zoom-pan-pinch pour le plan interactif"
```

---

## Task 8: Composant PlanMarker

**Files:**
- Create: `frontend/src/components/PlanMarker.tsx`
- Create: `frontend/src/components/PlanMarker.test.tsx`

- [ ] **Step 1: Écrire le test failing**

```tsx
// frontend/src/components/PlanMarker.test.tsx
import { render, screen } from '@testing-library/react'
import { PlanMarker } from './PlanMarker'

it('affiche le numéro de stand', () => {
  render(<PlanMarker stand="12" statut="actif" x={50} y={50} />)
  expect(screen.getByText('12')).toBeInTheDocument()
})

it('affiche un tiret si pas de stand', () => {
  render(<PlanMarker stand={null} statut="actif" x={10} y={20} />)
  expect(screen.getByText('—')).toBeInTheDocument()
})

it('applique la classe inactif quand statut=inactif', () => {
  const { container } = render(<PlanMarker stand="5" statut="inactif" x={0} y={0} />)
  expect(container.firstChild).toHaveClass('opacity-50')
})

it('applique la classe highlight quand highlight=true', () => {
  const { container } = render(<PlanMarker stand="5" statut="actif" x={0} y={0} highlight />)
  expect(container.firstChild).toHaveClass('animate-pulse')
})

it('positionne via inline style en pourcentage', () => {
  const { container } = render(<PlanMarker stand="5" statut="actif" x={42.5} y={67.8} />)
  const el = container.firstChild as HTMLElement
  expect(el.style.left).toBe('42.5%')
  expect(el.style.top).toBe('67.8%')
})
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

```bash
cd frontend && npx vitest run src/components/PlanMarker.test.tsx
```

Expected: échec ("Cannot find module './PlanMarker'").

- [ ] **Step 3: Implémenter PlanMarker**

```tsx
// frontend/src/components/PlanMarker.tsx
import { CSSProperties, forwardRef, MouseEvent, PointerEvent } from 'react'

interface Props {
  stand: string | null
  statut: 'actif' | 'inactif'
  x: number
  y: number
  highlight?: boolean
  onClick?: (e: MouseEvent) => void
  onPointerDown?: (e: PointerEvent) => void
  size?: number
  color?: string
}

export const PlanMarker = forwardRef<HTMLButtonElement, Props>(function PlanMarker(
  { stand, statut, x, y, highlight, onClick, onPointerDown, size = 32, color = '#1e1b4b' },
  ref,
) {
  const style: CSSProperties = {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: size,
    height: size,
    transform: 'translate(-50%, -50%)',
    backgroundColor: color,
  }
  const classes = [
    'rounded-full text-white text-xs font-semibold shadow-md flex items-center justify-center',
    'border-2 border-white cursor-pointer select-none touch-none',
    statut === 'inactif' ? 'opacity-50 grayscale' : '',
    highlight ? 'animate-pulse ring-4 ring-yellow-300' : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={style}
      className={classes}
    >
      {stand ?? '—'}
    </button>
  )
})
```

- [ ] **Step 4: Relancer les tests**

```bash
cd frontend && npx vitest run src/components/PlanMarker.test.tsx
```

Expected: tests verts.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PlanMarker.tsx frontend/src/components/PlanMarker.test.tsx
git commit -m "feat(plan): composant PlanMarker (pastille n° stand)"
```

---

## Task 9: Composant PlanCanvas (view mode + edit mode)

**Files:**
- Create: `frontend/src/components/PlanCanvas.tsx`
- Create: `frontend/src/components/PlanCanvas.test.tsx`

- [ ] **Step 1: Écrire les tests failing**

```tsx
// frontend/src/components/PlanCanvas.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { PlanCanvas } from './PlanCanvas'

const baseMarkers = [
  { id: 1, uuid: 'u1', stand: '1', statut: 'actif' as const, pos_x: 10, pos_y: 20 },
  { id: 2, uuid: 'u2', stand: '2', statut: 'inactif' as const, pos_x: 70, pos_y: 80 },
]

it('affiche tous les marqueurs en mode view', () => {
  render(<PlanCanvas mode="view" imageSrc="/test.png" markers={baseMarkers} />)
  expect(screen.getByText('1')).toBeInTheDocument()
  expect(screen.getByText('2')).toBeInTheDocument()
})

it('appelle onMarkerClick avec l\'id en mode view', () => {
  const onClick = vi.fn()
  render(<PlanCanvas mode="view" imageSrc="/x.png" markers={baseMarkers} onMarkerClick={onClick} />)
  fireEvent.click(screen.getByText('1'))
  expect(onClick).toHaveBeenCalledWith(1)
})

it('appelle onPlaceAt en mode edit quand on clique sur l\'image vide', () => {
  const onPlace = vi.fn()
  const { container } = render(
    <PlanCanvas mode="edit" imageSrc="/x.png" markers={baseMarkers} onPlaceAt={onPlace} />
  )
  const layer = container.querySelector('[data-testid="plan-click-layer"]') as HTMLElement
  Object.defineProperty(layer, 'getBoundingClientRect', {
    value: () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }),
  })
  fireEvent.click(layer, { clientX: 50, clientY: 75 })
  expect(onPlace).toHaveBeenCalledWith(50, 75)
})

it('met en évidence un marqueur via highlight', () => {
  const { container } = render(
    <PlanCanvas mode="view" imageSrc="/x.png" markers={baseMarkers} highlightId={1} />
  )
  const buttons = container.querySelectorAll('button')
  expect(buttons[0].className).toMatch(/animate-pulse/)
  expect(buttons[1].className).not.toMatch(/animate-pulse/)
})
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

```bash
cd frontend && npx vitest run src/components/PlanCanvas.test.tsx
```

Expected: échec (module manquant).

- [ ] **Step 3: Implémenter PlanCanvas**

```tsx
// frontend/src/components/PlanCanvas.tsx
import { useRef, MouseEvent, useState, useEffect } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { PlanMarker } from './PlanMarker'

interface Marker {
  id: number
  uuid: string
  stand: string | null
  statut: 'actif' | 'inactif'
  pos_x: number | null
  pos_y: number | null
}

interface ViewProps {
  mode: 'view'
  imageSrc: string
  markers: Marker[]
  highlightId?: number | null
  onMarkerClick?: (id: number) => void
}

interface EditProps {
  mode: 'edit'
  imageSrc: string
  markers: Marker[]
  highlightId?: number | null
  onMarkerClick?: (id: number) => void
  onPlaceAt?: (x: number, y: number) => void
  onMoveMarker?: (id: number, x: number, y: number) => void
}

type Props = ViewProps | EditProps

function isEditProps(p: Props): p is EditProps {
  return p.mode === 'edit'
}

export function PlanCanvas(props: Props) {
  const { imageSrc, markers, highlightId, onMarkerClick } = props
  const layerRef = useRef<HTMLDivElement | null>(null)
  const [dragId, setDragId] = useState<number | null>(null)

  function pctFromEvent(clientX: number, clientY: number): { x: number; y: number } | null {
    const layer = layerRef.current
    if (!layer) return null
    const rect = layer.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  function handleLayerClick(e: MouseEvent) {
    if (!isEditProps(props) || !props.onPlaceAt) return
    if (e.target !== e.currentTarget) return // clic sur un marqueur, pas sur l'image
    const pos = pctFromEvent(e.clientX, e.clientY)
    if (pos) props.onPlaceAt(pos.x, pos.y)
  }

  // Drag d'un marqueur (edit mode)
  useEffect(() => {
    if (!isEditProps(props) || dragId === null || !props.onMoveMarker) return
    const onMove = (ev: PointerEvent) => {
      const pos = pctFromEvent(ev.clientX, ev.clientY)
      if (pos && isEditProps(props) && props.onMoveMarker) {
        props.onMoveMarker(dragId, pos.x, pos.y)
      }
    }
    const onUp = () => setDragId(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragId, props])

  const content = (
    <div
      ref={layerRef}
      data-testid="plan-click-layer"
      onClick={handleLayerClick}
      style={{ position: 'relative', display: 'inline-block', cursor: isEditProps(props) ? 'crosshair' : 'default' }}
    >
      <img src={imageSrc} alt="Plan" draggable={false} style={{ display: 'block', maxWidth: '100%', userSelect: 'none' }} />
      {markers.map(m => (
        m.pos_x !== null && m.pos_y !== null ? (
          <PlanMarker
            key={m.id}
            stand={m.stand}
            statut={m.statut}
            x={m.pos_x}
            y={m.pos_y}
            highlight={highlightId === m.id}
            onClick={onMarkerClick ? () => onMarkerClick(m.id) : undefined}
            onPointerDown={isEditProps(props) ? (e) => {
              e.stopPropagation()
              setDragId(m.id)
            } : undefined}
          />
        ) : null
      ))}
    </div>
  )

  if (isEditProps(props)) return content

  return (
    <TransformWrapper minScale={1} maxScale={4} doubleClick={{ disabled: false }} wheel={{ disabled: false }}>
      <TransformComponent wrapperStyle={{ width: '100%' }}>
        {content}
      </TransformComponent>
    </TransformWrapper>
  )
}
```

- [ ] **Step 4: Relancer les tests**

```bash
cd frontend && npx vitest run src/components/PlanCanvas.test.tsx
```

Expected: tests verts.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PlanCanvas.tsx frontend/src/components/PlanCanvas.test.tsx
git commit -m "feat(plan): composant PlanCanvas (modes view + edit, zoom/pan, drag)"
```

---

## Task 10: Drawer mobile pour fiche exposant

**Files:**
- Create: `frontend/src/components/PlanExposantDrawer.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
// frontend/src/components/PlanExposantDrawer.tsx
import { Link } from 'react-router-dom'
import { X, ExternalLink } from 'lucide-react'

interface Props {
  exposant: {
    uuid: string
    nom: string
    entreprise: string | null
    stand: string | null
    statut: 'actif' | 'inactif'
  } | null
  onClose: () => void
}

export function PlanExposantDrawer({ exposant, onClose }: Props) {
  if (!exposant) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-up">
      <div className="bg-white rounded-t-2xl shadow-xl mx-auto max-w-sm p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900">{exposant.nom}</h3>
            {exposant.entreprise && (
              <p className="text-sm text-gray-600">{exposant.entreprise}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {exposant.stand && (
            <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full">
              Stand {exposant.stand}
            </span>
          )}
          {exposant.statut === 'inactif' && (
            <span className="inline-block bg-gray-200 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
              Inactif
            </span>
          )}
        </div>
        <Link
          to={`/e/${exposant.uuid}`}
          className="inline-flex items-center justify-center w-full gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Voir la fiche complète
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier que ça compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PlanExposantDrawer.tsx
git commit -m "feat(plan): drawer mobile fiche exposant"
```

---

## Task 11: Page publique PlanView

**Files:**
- Create: `frontend/src/pages/public/PlanView.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Implémenter la page**

```tsx
// frontend/src/pages/public/PlanView.tsx
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SearchX } from 'lucide-react'
import { api } from '../../api'
import type { Plan, PlanWithExposants } from '../../types'
import { PlanCanvas } from '../../components/PlanCanvas'
import { PlanExposantDrawer } from '../../components/PlanExposantDrawer'

const EVENT_NAME = import.meta.env.VITE_EVENT_NAME ?? 'Comptoir'
const EVENT_COLOR = import.meta.env.VITE_EVENT_COLOR ?? '#1e1b4b'

export function PlanView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState<Plan[]>([])
  const [activePlan, setActivePlan] = useState<PlanWithExposants | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [selectedExposantId, setSelectedExposantId] = useState<number | null>(null)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const highlightUuid = searchParams.get('highlight')

  useEffect(() => {
    api.plans.list().then(list => {
      setPlans(list)
      if (list.length > 0) setActiveId(list[0].id)
    })
  }, [])

  useEffect(() => {
    if (activeId == null) return
    api.plans.get(activeId).then(setActivePlan)
  }, [activeId])

  // Si ?highlight=:uuid présent, trouver le bon plan et y aller
  useEffect(() => {
    if (!highlightUuid || plans.length === 0) return
    let cancelled = false
    ;(async () => {
      for (const p of plans) {
        const full = await api.plans.get(p.id)
        if (cancelled) return
        const found = full.exposants.find(e => e.uuid === highlightUuid)
        if (found) {
          setActiveId(p.id)
          setActivePlan(full)
          setHighlightId(found.id ?? null)
          setSelectedExposantId(found.id ?? null)
          // clear le highlight après 4 secondes
          setTimeout(() => setHighlightId(null), 4000)
          return
        }
      }
    })()
    return () => { cancelled = true }
  }, [highlightUuid, plans])

  const selectedExposant = useMemo(() => {
    if (!activePlan || selectedExposantId == null) return null
    return activePlan.exposants.find(e => e.id === selectedExposantId) ?? null
  }, [activePlan, selectedExposantId])

  const filteredMarkers = useMemo(() => {
    if (!activePlan) return []
    if (!search.trim()) return activePlan.exposants
    const q = search.toLowerCase()
    return activePlan.exposants.filter(e =>
      e.nom.toLowerCase().includes(q) ||
      (e.entreprise ?? '').toLowerCase().includes(q) ||
      (e.stand ?? '').toLowerCase().includes(q)
    )
  }, [activePlan, search])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-4 py-3 text-center" style={{ backgroundColor: EVENT_COLOR }}>
        <h1 className="text-white text-sm font-semibold">{EVENT_NAME}</h1>
      </header>

      <div className="p-3 bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un exposant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {plans.length > 1 && (
        <div className="flex gap-1 px-3 py-2 bg-white border-b border-gray-200 overflow-x-auto">
          {plans.map(p => (
            <button
              key={p.id}
              onClick={() => { setActiveId(p.id); setSelectedExposantId(null); setSearchParams({}) }}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeId === p.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.nom}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 flex items-center justify-center p-4">
        {!activePlan ? (
          <div className="text-center text-gray-500">
            <SearchX size={40} strokeWidth={1.5} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Aucun plan disponible</p>
          </div>
        ) : (
          <PlanCanvas
            mode="view"
            imageSrc={activePlan.image_file}
            markers={filteredMarkers}
            highlightId={highlightId}
            onMarkerClick={id => setSelectedExposantId(id)}
          />
        )}
      </main>

      <PlanExposantDrawer
        exposant={selectedExposant}
        onClose={() => setSelectedExposantId(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Ajouter la route dans `App.tsx`**

Dans `frontend/src/App.tsx`, ajouter en haut un import :

```typescript
import { PlanView } from './pages/public/PlanView'
```

Et ajouter la route avant `<Route path="*"...>` :

```tsx
<Route path="/plan" element={<PlanView />} />
```

- [ ] **Step 3: Vérifier que ça compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 4: Test manuel rapide**

Démarre dev server et visite `http://localhost:5174/plan`. Si aucun plan n'a été créé, tu dois voir "Aucun plan disponible".

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/public/PlanView.tsx frontend/src/App.tsx
git commit -m "feat(plan): page publique /plan avec tabs, recherche, drawer"
```

---

## Task 12: Bouton "Voir sur le plan" sur PublicCard

**Files:**
- Modify: `frontend/src/pages/public/PublicCard.tsx`

- [ ] **Step 1: Étendre PublicCard pour afficher le bouton si exposant placé**

Dans `frontend/src/pages/public/PublicCard.tsx`, ajouter l'import :

```typescript
import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
```

(Si `Link` est déjà importé via une autre instruction, ne pas dupliquer.)

Localiser la section juste après le bloc "Description" (`{exposant.description && ...}`) et juste avant le bloc "Contacts" (`<div className="space-y-3">`). Insérer :

```tsx
{exposant.plan_id != null && (
  <Link
    to={`/plan?highlight=${exposant.uuid}`}
    className="flex items-center gap-2 text-sm text-indigo-700 hover:text-indigo-900 mb-5"
  >
    <MapPin size={16} />
    Voir sur le plan
  </Link>
)}
```

- [ ] **Step 2: Vérifier que ça compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/public/PublicCard.tsx
git commit -m "feat(plan): bouton \"Voir sur le plan\" sur la fiche publique"
```

---

## Task 13: Page admin PlanList

**Files:**
- Create: `frontend/src/pages/admin/PlanList.tsx`

- [ ] **Step 1: Créer la page**

```tsx
// frontend/src/pages/admin/PlanList.tsx
import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, MapPin, Trash2, Pencil } from 'lucide-react'
import { api } from '../../api'
import type { Plan } from '../../types'
import { useToast } from '../../components/Toast'
import { ConfirmDialog } from '../../components/ConfirmDialog'

export function PlanList() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<Plan | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newNom, setNewNom] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    api.plans.list().then(setPlans).finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    const file = fileRef.current?.files?.[0]
    if (!newNom.trim() || !file) {
      toast.show('error', 'Nom et image requis')
      return
    }
    setCreating(true)
    try {
      const plan = await api.plans.create(newNom.trim(), file)
      setCreateOpen(false)
      setNewNom('')
      navigate(`/admin/plans/${plan.id}`)
    } catch (e) {
      toast.show('error', e instanceof Error ? e.message : 'Erreur')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    const plan = confirmDelete
    setConfirmDelete(null)
    try {
      await api.plans.delete(plan.id)
      setPlans(prev => prev.filter(p => p.id !== plan.id))
      toast.show('success', `"${plan.nom}" supprimé`)
    } catch {
      toast.show('error', 'Erreur lors de la suppression')
    }
  }

  if (loading) return <div className="text-gray-400">Chargement…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Plans</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          Nouveau plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin size={40} strokeWidth={1.5} className="mx-auto mb-3 text-gray-600" />
          <p className="text-sm">Aucun plan pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <Link to={`/admin/plans/${p.id}`} className="block aspect-video bg-gray-800 overflow-hidden">
                <img src={p.image_file} alt={p.nom} className="w-full h-full object-cover" />
              </Link>
              <div className="p-3 flex items-center justify-between">
                <div className="font-medium text-white truncate">{p.nom}</div>
                <div className="flex items-center gap-1">
                  <Link to={`/admin/plans/${p.id}`} className="p-1.5 rounded text-blue-400 hover:bg-gray-800" aria-label="Éditer">
                    <Pencil size={14} />
                  </Link>
                  <button onClick={() => setConfirmDelete(p)} className="p-1.5 rounded text-red-400 hover:bg-gray-800" aria-label="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setCreateOpen(false)}>
          <div className="bg-gray-900 rounded-xl p-6 max-w-sm w-full border border-gray-800" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Nouveau plan</h2>
            <label className="block text-sm text-gray-400 mb-1">Nom</label>
            <input
              value={newNom}
              onChange={e => setNewNom(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              placeholder="Ex. Halle 1"
            />
            <label className="block text-sm text-gray-400 mb-1">Image</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-700 file:text-white hover:file:bg-gray-600 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg"
              >
                {creating ? 'Création…' : 'Créer'}
              </button>
              <button onClick={() => setCreateOpen(false)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        destructive
        title="Supprimer le plan"
        message={`"${confirmDelete?.nom}" sera supprimé. Les exposants placés dessus seront détachés (pas supprimés).`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Vérifier que ça compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/PlanList.tsx
git commit -m "feat(admin): page liste des plans avec création/suppression"
```

---

## Task 14: Sidebar éditeur

**Files:**
- Create: `frontend/src/components/PlanEditorSidebar.tsx`

- [ ] **Step 1: Créer la sidebar**

```tsx
// frontend/src/components/PlanEditorSidebar.tsx
import type { Exposant } from '../types'
import { MapPin, X } from 'lucide-react'

interface Props {
  toPlace: Exposant[]
  placed: Exposant[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  onDetach: (id: number) => void
}

export function PlanEditorSidebar({ toPlace, placed, selectedId, onSelect, onDetach }: Props) {
  return (
    <aside className="w-full sm:w-72 sm:max-w-72 bg-gray-900 border-l border-gray-800 flex flex-col">
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">À PLACER ({toPlace.length})</h3>
        <p className="text-xs text-gray-500 mt-1">
          Sélectionnez un exposant puis cliquez sur le plan pour le placer.
        </p>
      </div>
      <div className="overflow-y-auto max-h-64">
        {toPlace.length === 0 && (
          <p className="p-3 text-xs text-gray-500">Tous les exposants actifs sont placés.</p>
        )}
        {toPlace.map(e => (
          <button
            key={e.id}
            onClick={() => onSelect(selectedId === e.id ? null : e.id ?? null)}
            className={`w-full text-left px-3 py-2 text-sm border-b border-gray-800 hover:bg-gray-800 ${
              selectedId === e.id ? 'bg-blue-900/40 text-white' : 'text-gray-300'
            }`}
          >
            <div className="font-medium truncate">{e.nom}</div>
            {e.entreprise && <div className="text-xs text-gray-500 truncate">{e.entreprise}</div>}
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">SUR CE PLAN ({placed.length})</h3>
      </div>
      <div className="overflow-y-auto flex-1">
        {placed.map(e => (
          <div key={e.id} className="flex items-center justify-between px-3 py-2 text-sm border-b border-gray-800 text-gray-300">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate flex items-center gap-1">
                <MapPin size={12} className="text-blue-400" />
                {e.nom}
              </div>
              {e.stand && <div className="text-xs text-gray-500">Stand {e.stand}</div>}
            </div>
            <button
              onClick={() => onDetach(e.id!)}
              aria-label={`Retirer ${e.nom} du plan`}
              className="p-1 text-gray-500 hover:text-red-400"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Vérifier que ça compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PlanEditorSidebar.tsx
git commit -m "feat(plan): sidebar éditeur (À placer / Sur ce plan)"
```

---

## Task 15: Page éditeur PlanEditor

**Files:**
- Create: `frontend/src/pages/admin/PlanEditor.tsx`

- [ ] **Step 1: Créer la page**

```tsx
// frontend/src/pages/admin/PlanEditor.tsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Image as ImageIcon, Trash2 } from 'lucide-react'
import { api } from '../../api'
import type { Exposant, PlanWithExposants } from '../../types'
import { PlanCanvas } from '../../components/PlanCanvas'
import { PlanEditorSidebar } from '../../components/PlanEditorSidebar'
import { useToast } from '../../components/Toast'
import { ConfirmDialog } from '../../components/ConfirmDialog'

export function PlanEditor() {
  const { id } = useParams<{ id: string }>()
  const planId = Number(id)
  const navigate = useNavigate()
  const toast = useToast()
  const [plan, setPlan] = useState<PlanWithExposants | null>(null)
  const [allExposants, setAllExposants] = useState<Exposant[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    if (!planId) return
    Promise.all([api.plans.get(planId), api.exposants.list()])
      .then(([p, exps]) => {
        setPlan(p)
        setAllExposants(exps)
        setRenameValue(p.nom)
      })
      .catch(() => toast.show('error', 'Plan introuvable'))
  }, [planId])

  const toPlace = useMemo(() => {
    if (!plan) return []
    const placedIds = new Set(plan.exposants.map(e => e.id))
    return allExposants.filter(e => e.statut === 'actif' && !placedIds.has(e.id))
  }, [plan, allExposants])

  const placed = useMemo(() => {
    if (!plan) return []
    return allExposants.filter(e => plan.exposants.some(p => p.id === e.id))
  }, [plan, allExposants])

  async function placeAt(x: number, y: number) {
    if (selectedId == null || !plan) return
    try {
      await api.exposants.setPosition(selectedId, { plan_id: planId, pos_x: x, pos_y: y })
      const updated = await api.plans.get(planId)
      setPlan(updated)
      setSelectedId(null)
      toast.show('success', 'Exposant placé')
    } catch (e) {
      toast.show('error', e instanceof Error ? e.message : 'Erreur')
    }
  }

  async function moveMarker(id: number, x: number, y: number) {
    // optimistic
    setPlan(prev => prev ? { ...prev, exposants: prev.exposants.map(m => m.id === id ? { ...m, pos_x: x, pos_y: y } : m) } : prev)
  }

  async function commitMove(id: number) {
    if (!plan) return
    const m = plan.exposants.find(x => x.id === id)
    if (!m || m.pos_x == null || m.pos_y == null) return
    try {
      await api.exposants.setPosition(id, { plan_id: planId, pos_x: m.pos_x, pos_y: m.pos_y })
    } catch {
      toast.show('error', 'Erreur sauvegarde position')
    }
  }

  async function detach(id: number) {
    try {
      await api.exposants.setPosition(id, { plan_id: null })
      const updated = await api.plans.get(planId)
      setPlan(updated)
    } catch {
      toast.show('error', 'Erreur')
    }
  }

  async function handleRename() {
    if (!plan) return
    try {
      const updated = await api.plans.update(plan.id, { nom: renameValue.trim() })
      setPlan({ ...plan, nom: updated.nom })
      setRenaming(false)
      toast.show('success', 'Plan renommé')
    } catch {
      toast.show('error', 'Erreur')
    }
  }

  async function handleDelete() {
    if (!plan) return
    try {
      await api.plans.delete(plan.id)
      navigate('/admin/plans')
    } catch {
      toast.show('error', 'Erreur')
    }
  }

  if (!plan) return <div className="text-gray-400">Chargement…</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Link to="/admin/plans" className="text-gray-400 hover:text-white" aria-label="Retour"><ArrowLeft size={18} /></Link>
          {renaming ? (
            <div className="flex items-center gap-1">
              <input
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
              />
              <button onClick={handleRename} className="text-sm text-blue-400 hover:text-blue-300">OK</button>
              <button onClick={() => { setRenaming(false); setRenameValue(plan.nom) }} className="text-sm text-gray-400">Annuler</button>
            </div>
          ) : (
            <h1 className="text-xl font-bold">
              {plan.nom}
              <button onClick={() => setRenaming(true)} className="ml-2 text-sm text-blue-400 hover:text-blue-300">Renommer</button>
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm cursor-pointer">
            <ImageIcon size={14} />
            Remplacer image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                try {
                  await api.plans.replaceImage(plan.id, f)
                  const updated = await api.plans.get(plan.id)
                  setPlan(updated)
                  toast.show('success', 'Image remplacée')
                } catch (err) {
                  toast.show('error', err instanceof Error ? err.message : 'Erreur')
                }
              }}
            />
          </label>
          <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded-lg text-sm">
            <Trash2 size={14} />
            Supprimer
          </button>
        </div>
      </div>

      {selectedId != null && (
        <div className="mb-3 p-2 bg-blue-900/30 border border-blue-800 text-blue-200 text-sm rounded-lg">
          Mode placement actif — cliquez sur le plan où placer l'exposant.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-3 overflow-auto">
          <PlanCanvas
            mode="edit"
            imageSrc={plan.image_file}
            markers={plan.exposants}
            onPlaceAt={placeAt}
            onMoveMarker={(id, x, y) => moveMarker(id, x, y)}
            onMarkerClick={(id) => {
              // commit position après drag éventuel
              commitMove(id)
            }}
          />
        </div>
        <PlanEditorSidebar
          toPlace={toPlace}
          placed={placed}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDetach={detach}
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        destructive
        title="Supprimer le plan"
        message={`"${plan.nom}" sera supprimé. Les exposants placés dessus seront détachés.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Vérifier que ça compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/PlanEditor.tsx
git commit -m "feat(admin): éditeur visuel plan (placement + drag + renommer + remplacer image)"
```

---

## Task 16: Routes admin + lien nav

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/admin/AdminLayout.tsx`

- [ ] **Step 1: Ajouter les routes admin**

Dans `frontend/src/App.tsx`, ajouter les imports :

```typescript
import { PlanList } from './pages/admin/PlanList'
import { PlanEditor } from './pages/admin/PlanEditor'
```

Dans la `<Route path="/admin"...>`, après la route `utilisateurs/:id` et avant la fermeture du bloc admin :

```tsx
<Route path="plans" element={<PlanList />} />
<Route path="plans/:id" element={<PlanEditor />} />
```

- [ ] **Step 2: Ajouter le lien nav dans `AdminLayout.tsx`**

Dans le bloc desktop (`<div className="hidden sm:flex items-center gap-6">`), après le lien "Utilisateurs", ajouter :

```tsx
<Link
  to="/admin/plans"
  className={`text-sm transition-colors ${
    isActive('/admin/plans') ? 'text-white' : 'text-gray-400 hover:text-white'
  }`}
>
  Plans
</Link>
```

Dans le menu mobile (le bloc `{menuOpen && ...}`), après le lien Utilisateurs et avant le `<div className="border-t border-gray-800 my-2 pt-2">` :

```tsx
<Link
  to="/admin/plans"
  onClick={() => setMenuOpen(false)}
  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
    isActive('/admin/plans') ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
  }`}
>
  Plans
</Link>
```

- [ ] **Step 3: Vérifier que ça compile**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 erreur.

- [ ] **Step 4: Test manuel end-to-end**

1. Démarre les deux serveurs
2. Connecte-toi admin
3. Va dans "Plans" → "Nouveau plan"
4. Upload une image, donne un nom → tu arrives dans l'éditeur
5. Clique sur un exposant dans la sidebar, puis sur le plan → le marqueur apparaît
6. Drag le marqueur → il bouge
7. Ouvre `/plan` (URL directe ou via le bouton "Voir sur le plan" de la fiche exposant) → tu vois le marqueur

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/pages/admin/AdminLayout.tsx
git commit -m "feat(admin): routes /admin/plans + lien nav (desktop + mobile)"
```

---

## Task 17: Tests d'intégration end-to-end manuels

**Files:** aucun fichier (validation manuelle)

- [ ] **Step 1: Vérifier le flow complet**

Scénarios à valider dans le navigateur :

1. **Création d'un plan** : `/admin/plans` → "Nouveau plan" → image PNG/JPG → arrive sur l'éditeur.
2. **Placement** : sélectionner un exposant, cliquer sur le plan → marqueur apparaît.
3. **Drag** : maintenir et déplacer un marqueur → position mise à jour.
4. **Détacher** : bouton X dans "SUR CE PLAN" → l'exposant revient dans "À PLACER".
5. **Suppression du plan** : bouton "Supprimer" → exposants détachés (vérifier dans la liste exposants).
6. **Vue publique** : `/plan` → marqueurs visibles, tap → drawer, lien vers fiche complète.
7. **Highlight via QR** : depuis une fiche publique `/e/:uuid` (placée), cliquer "Voir sur le plan" → bon plan ouvert, marqueur clignote 4s.
8. **Recherche** : tape un nom → seul le marqueur correspondant reste visible.
9. **Multi-plan** : crée un 2e plan, vérifie que les tabs apparaissent et fonctionnent.
10. **Image invalide** : tente d'uploader un fichier `.txt` renommé `.png` → rejet avec message clair.

- [ ] **Step 2: Lancer les tests backend complets pour s'assurer qu'on n'a rien cassé**

```bash
cd backend && npm test
```

Expected: tous verts.

- [ ] **Step 3: Lancer les tests frontend**

```bash
cd frontend && npx vitest run
```

Expected: tous verts.

- [ ] **Step 4: Push final**

```bash
git push origin master
```

---

## Self-Review

**Spec coverage :**
- Section 1 (Modèle de données) → Task 1
- Section 2 (Navigation publique, mobile-first, tabs, drawer, zoom/pan, highlight via uuid) → Tasks 8, 9, 10, 11
- Section 3 (Éditeur admin, clic-pour-placer, drag) → Tasks 9 (mode edit), 13, 14, 15
- Section 4 (API routes plans CRUD + position) → Tasks 4, 5
- Section 5 (Intégrations PublicCard + AdminLayout) → Tasks 12, 16
- Magic bytes / image validation factorisé → Task 3
- Cas d'erreur (position hors borne, plan_id inexistant, magic bytes) → Tests dans Tasks 4 et 5

**Placeholder scan :** aucun TBD/TODO/handle edge cases sans détail. Chaque step contient le code ou la commande complète.

**Type consistency :** `Plan`, `PlanWithExposants`, `Exposant.plan_id|pos_x|pos_y` — signatures cohérentes entre Tasks 2, 6, 9, 11, 15. Méthodes API : `setPosition`, `plans.list/get/create/update/replaceImage/delete` — utilisées identiquement dans toutes les tasks frontend.

**Hors scope (rappelé du spec) :** catégories, multi-événement, mode favoris, SVG vectoriel, notifications. Aucune task ne touche à ça.
