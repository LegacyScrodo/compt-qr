import 'dotenv/config'

function required(key: string, minLength = 1): string {
  const val = process.env[key]
  if (!val) throw new Error(`Variable d'environnement manquante: ${key}`)
  if (val.length < minLength) throw new Error(`${key} trop court (min ${minLength} caractères)`)
  return val
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET', 32),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: (() => {
    const p = parseInt(process.env.PORT ?? '3000', 10)
    if (isNaN(p)) throw new Error('PORT doit être un nombre valide')
    return p
  })(),
  baseUrl: process.env.BASE_URL ?? 'http://localhost:5173',
}
