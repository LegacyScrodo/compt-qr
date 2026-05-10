-- Mot de passe: "admin2027" pour admin, "staff2027" pour staff
-- Ces hashes bcrypt correspondent aux mots de passe ci-dessus (coût 12)
-- Régénérer en prod avec: node -e "const b=require('bcrypt');b.hash('monmdp',12).then(console.log)"
INSERT INTO users (email, password, role) VALUES
  ('admin@comptoir.ch', '$2b$12$KKlY5CV6t4njgC9hAUImSO2Z2quqtyXQ0qG96NcatjYjFo8tkh.X.', 'admin'),
  ('staff@comptoir.ch',  '$2b$12$Qm133K4YaKSprIhzYiCmtuinbxmnda8nEuWV.tgNs9kFU1fGBu7QK', 'staff')
ON CONFLICT DO NOTHING;

INSERT INTO exposants (nom, entreprise, stand, email, telephone, site_web, description, statut) VALUES
  ('Jean Dupont', 'Horlogerie Dupont', '12', 'jean@dupont.ch', '+41 21 000 00 01', 'https://dupont-horlogerie.ch', 'Maître horloger depuis 1982.', 'actif'),
  ('Marie Martin', 'Boutique Martin', '7',  'marie@martin.ch', '+41 21 000 00 02', NULL, NULL, 'actif'),
  ('Paul Favre', 'Bijouterie Favre', '3',  NULL, NULL, NULL, NULL, 'inactif')
ON CONFLICT DO NOTHING;
