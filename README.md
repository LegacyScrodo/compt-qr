# ComptQR

Système de gestion des exposants par QR codes pour le Comptoir de la Vallée de Joux.

## Déploiement sur VPS (Hetzner)

### Prérequis
- Docker et Docker Compose installés
- Domaine `compt-qr.ch` pointant vers l'IP du serveur

### Installation

```bash
git clone <repo> compt-qr && cd compt-qr

# Créer acme.json pour Traefik SSL
touch acme.json && chmod 600 acme.json

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env : JWT_SECRET (min 32 chars), POSTGRES_PASSWORD

# Construire et lancer
docker compose up -d

# Migrer la base de données
docker compose exec api npm run db:migrate

# (Optionnel) Charger les données de test
docker compose exec api npm run db:seed
```

### Variables d'environnement

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret JWT — minimum 32 caractères aléatoires |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `VITE_EVENT_COLOR` | Couleur principale (ex. `#1e1b4b`) |
| `VITE_EVENT_NAME` | Nom de l'événement |

### Comptes par défaut (seed)

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@comptoir.ch | admin2027 | Admin |
| staff@comptoir.ch | staff2027 | Staff |

> **Changer les mots de passe en production** via l'interface admin ou directement en DB.

### Développement local

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (autre terminal)
cd frontend && npm install && npm run dev
```
