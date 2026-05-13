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
