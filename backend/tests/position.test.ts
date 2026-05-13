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
