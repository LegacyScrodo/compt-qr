import pg, { Pool } from 'pg'
import { config } from '../config'

// Parse Postgres NUMERIC (OID 1700) as JS number — used for pos_x/pos_y
// Acceptable here because our DECIMAL columns hold small bounded percentages,
// not financial amounts where precision matters.
pg.types.setTypeParser(1700, parseFloat)

export const pool = new Pool({ connectionString: config.databaseUrl })

pool.on('error', (err) => console.error('Unexpected error on idle DB client', err))
