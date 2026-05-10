CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(150) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS exposants (
  id          SERIAL PRIMARY KEY,
  uuid        UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  nom         VARCHAR(100) NOT NULL,
  entreprise  VARCHAR(150),
  stand       VARCHAR(20),
  email       VARCHAR(150),
  telephone   VARCHAR(30),
  site_web    VARCHAR(255),
  description TEXT,
  logo_url    VARCHAR(255),
  logo_file   VARCHAR(255),
  statut      VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exposants_updated_at
  BEFORE UPDATE ON exposants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
