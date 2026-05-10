import request from 'supertest'
import { createApp } from '../src/app'

const app = createApp()

async function loginAs(role: 'admin' | 'staff') {
  const creds = role === 'admin'
    ? { email: 'admin@comptoir.ch', password: 'admin2027' }
    : { email: 'staff@comptoir.ch', password: 'staff2027' }
  const res = await request(app).post('/api/auth/login').send(creds)
  return res.headers['set-cookie'] as unknown as string[]
}

let seedUuid: string

describe('GET /api/exposants/:uuid', () => {
  beforeAll(async () => {
    const res = await request(app)
      .get('/api/exposants')
      .set('Cookie', await loginAs('admin'))
    seedUuid = res.body[0].uuid
  })

  it('retourne les champs publics pour un exposant actif', async () => {
    const res = await request(app).get(`/api/exposants/${seedUuid}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ nom: expect.any(String), statut: 'actif' })
    expect(res.body).not.toHaveProperty('id')
  })

  it('retourne 404 pour UUID inconnu', async () => {
    const res = await request(app).get('/api/exposants/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })
})

describe('GET /api/exposants (admin)', () => {
  it('retourne la liste complète pour admin', async () => {
    const cookie = await loginAs('admin')
    const res = await request(app).get('/api/exposants').set('Cookie', cookie)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
  })

  it('retourne 401 sans auth', async () => {
    const res = await request(app).get('/api/exposants')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/exposants (admin)', () => {
  it('crée un exposant et retourne 201', async () => {
    const cookie = await loginAs('admin')
    const res = await request(app)
      .post('/api/exposants')
      .set('Cookie', cookie)
      .send({ nom: 'Test Exposant', stand: '99', statut: 'actif' })
    expect(res.status).toBe(201)
    expect(res.body.uuid).toBeDefined()
  })

  it('retourne 400 si nom manquant', async () => {
    const cookie = await loginAs('admin')
    const res = await request(app)
      .post('/api/exposants')
      .set('Cookie', cookie)
      .send({ stand: '99' })
    expect(res.status).toBe(400)
  })
})
