-- Mot de passe: "admin2027" pour admin, "staff2027" pour staff
-- Ces hashes bcrypt correspondent aux mots de passe ci-dessus (coût 12)
-- Régénérer en prod avec: node -e "const b=require('bcrypt');b.hash('monmdp',12).then(console.log)"
INSERT INTO users (email, password, role) VALUES
  ('admin@comptoir.ch', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewHpGCRK4gxO5m5e', 'admin'),
  ('staff@comptoir.ch',  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/5TxZVb1RtOq0THDBO', 'staff')
ON CONFLICT DO NOTHING;

INSERT INTO exposants (nom, entreprise, stand, email, telephone, site_web, description, statut) VALUES
  ('Jean Dupont', 'Horlogerie Dupont', '12', 'jean@dupont.ch', '+41 21 000 00 01', 'https://dupont-horlogerie.ch', 'Maître horloger depuis 1982.', 'actif'),
  ('Marie Martin', 'Boutique Martin', '7',  'marie@martin.ch', '+41 21 000 00 02', NULL, NULL, 'actif'),
  ('Paul Favre', 'Bijouterie Favre', '3',  NULL, NULL, NULL, NULL, 'inactif')
ON CONFLICT DO NOTHING;
