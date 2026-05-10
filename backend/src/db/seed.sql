-- Mot de passe: "admin2027" pour admin, "staff2027" pour staff
-- Ces hashes bcrypt correspondent aux mots de passe ci-dessus (coût 12)
-- Régénérer en prod avec: node -e "const b=require('bcrypt');b.hash('monmdp',12).then(console.log)"
INSERT INTO users (email, password, role) VALUES
  ('admin@comptoir.ch', '$2b$12$OXco.0NmnyjigeJsvq3Rhe929JV24zfs5qpo56yZnqs3PSstD5QCW', 'admin'),
  ('staff@comptoir.ch',  '$2b$12$Grfel4HwKQ5zriyB49OcG.JJbxOk2Uqk.5zR.45n4vVkipkBbGXfO', 'staff')
ON CONFLICT DO NOTHING;

INSERT INTO exposants (nom, entreprise, stand, email, telephone, site_web, description, statut) VALUES
  ('Jean Dupont', 'Horlogerie Dupont', '12', 'jean@dupont.ch', '+41 21 000 00 01', 'https://dupont-horlogerie.ch', 'Maître horloger depuis 1982.', 'actif'),
  ('Marie Martin', 'Boutique Martin', '7',  'marie@martin.ch', '+41 21 000 00 02', NULL, NULL, 'actif'),
  ('Paul Favre', 'Bijouterie Favre', '3',  NULL, NULL, NULL, NULL, 'inactif')
ON CONFLICT DO NOTHING;
