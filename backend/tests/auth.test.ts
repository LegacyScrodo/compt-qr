import request from 'supertest'
import { createApp } from '../src/app'

const app = createApp()

describe('POST /api/auth/login', () => {
  it('retourne 200 et cookie pour admin valide', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@comptoir.ch', password: 'admin2027' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ role: 'admin', email: 'admin@comptoir.ch' })
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('retourne 200 pour staff valide', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@comptoir.ch', password: 'staff2027' })

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('staff')
  })

  it('retourne 401 pour mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@comptoir.ch', password: 'mauvais' })

    expect(res.status).toBe(401)
  })

  it('retourne 401 pour email inconnu', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@test.ch', password: 'password' })

    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('retourne 401 sans cookie', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
