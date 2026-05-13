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
    expect(fs.existsSync(oldDiskPath)).toBe(false)
  })

  it('DELETE /api/plans/:id supprime le plan et détache les exposants', async () => {
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
