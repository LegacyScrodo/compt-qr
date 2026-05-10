import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Variable d'environnement manquante: ${key}`)
  return val
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: (() => {
    const p = parseInt(process.env.PORT ?? '3000', 10)
    if (isNaN(p)) throw new Error('PORT doit être un nombre valide')
    return p
  })(),
  baseUrl: process.env.BASE_URL ?? 'http://localhost:5173',
}
