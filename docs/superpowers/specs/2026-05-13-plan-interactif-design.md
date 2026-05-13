# Plan interactif des exposants

**Date :** 2026-05-13
**Statut :** validé, prêt pour plan d'implémentation

## Objectif

Permettre aux visiteurs de localiser visuellement les exposants sur un plan
de l'événement, et à l'admin de placer les exposants sur ce plan via une
interface dédiée. Multi-plans supporté (2-3 plans typiques : halle
intérieure, zone extérieure, etc.).

## Contraintes et hypothèses

- **Cible UX publique :** mobile-first. Le desktop fonctionne mais n'est pas
  prioritaire — les visiteurs consultent le plan sur leur téléphone pendant
  l'événement.
- **Plans :** images bitmap (PNG / JPG), uploadées par l'admin. Pas de SVG
  vectoriel dans cette version.
- **Nombre de plans :** 2-3 typique. Navigation par tabs en haut.
- **Catégories d'exposants :** hors scope, traité dans une feature séparée.
- **Positionnement :** en pourcentage (0-100) relatif à l'image, jamais en
  pixels — garantit que le marqueur reste au bon endroit sur n'importe quel
  écran.

## Modèle de données

### Nouvelle table `plans`

```sql
CREATE TABLE plans (
  id          SERIAL PRIMARY KEY,
  nom         VARCHAR(100) NOT NULL,
  image_file  VARCHAR(255) NOT NULL,
  ordre       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Colonnes ajoutées à `exposants`

```sql
ALTER TABLE exposants
  ADD COLUMN plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  ADD COLUMN pos_x   DECIMAL(5,2) CHECK (pos_x >= 0 AND pos_x <= 100),
  ADD COLUMN pos_y   DECIMAL(5,2) CHECK (pos_y >= 0 AND pos_y <= 100);
```

Si `plan_id IS NULL`, l'exposant existe mais n'est placé sur aucun plan
(état initial après création). Si `plan_id` est défini, `pos_x` et `pos_y`
doivent l'être aussi (validé côté API).

`ON DELETE SET NULL` : si un plan est supprimé, les exposants associés
deviennent non-placés mais ne sont pas supprimés.

### Migration

Nouveau fichier `backend/src/db/migrations/002_plans.sql` avec ces deux
blocs. Pas de réécriture de `001_init.sql` — on garde l'historique des
migrations propre.

## API

### Routes plans (`backend/src/routes/plans.ts`)

| Méthode | Chemin                     | Auth   | Description                                        |
|---------|----------------------------|--------|----------------------------------------------------|
| GET     | `/api/plans`               | public | liste `{id, nom, image_file, ordre}`               |
| GET     | `/api/plans/:id`           | public | plan + exposants placés (champs publics seulement) |
| POST    | `/api/plans`               | admin  | crée + upload image (multipart, champ `image`)     |
| PUT     | `/api/plans/:id`           | admin  | met à jour `nom` et/ou `ordre`                     |
| POST    | `/api/plans/:id/image`     | admin  | remplace l'image (ancienne supprimée du disque)    |
| DELETE  | `/api/plans/:id`           | admin  | supprime plan + image, exposants détachés          |

### Route positionnement (ajoutée à `exposants.ts`)

| Méthode | Chemin                          | Auth  | Body                                          |
|---------|---------------------------------|-------|-----------------------------------------------|
| PUT     | `/api/exposants/:id/position`   | admin | `{plan_id: number, pos_x: number, pos_y: number}` ou `{plan_id: null}` pour détacher |

Validation : `plan_id` doit référencer un plan existant ; `pos_x` et `pos_y`
entre 0 et 100. Si `plan_id: null`, on met `pos_x` et `pos_y` à `NULL`.

### Validation des images de plan

Même approche que les logos d'exposants :

- `multer.memoryStorage()` + validation magic bytes (JPEG / PNG)
- Taille max : 10 MB (plus généreux que les logos à 5 MB — un plan est un
  fond de page, justifie une image plus grande)
- Stockage dans `backend/uploads/plans/` (sous-dossier dédié)
- Filename randomisé : `${Date.now()}-${random}.{ext}`

## UX publique (mobile-first)

### Route `/plan` (optionnellement `/plan?highlight=:uuid`)

```
┌────────────────────────────┐
│ ← Comptoir de la Vallée    │  ← bande couleur événement
├────────────────────────────┤
│ 🔍 Rechercher un exposant…  │  ← barre debounced 200ms
├────────────────────────────┤
│ ╔════════╦═══════════╗     │
│ ║Halle 1 ║ Extérieur ║     │  ← tabs si >1 plan
│ ╚════════╩═══════════╝     │
│                            │
│   [Image du plan]          │
│    • 12   • 7              │  ← marqueurs absolus en %
│        • 3                 │
│                            │
│   (pinch-zoom + pan)       │
└────────────────────────────┘
```

**Comportement :**

- Tabs en haut pour switcher entre plans, masqués si un seul plan
- Recherche : filtre les marqueurs visibles ; un résultat trouvé →
  switch automatique vers le bon plan + marqueur clignote 2 secondes +
  centrage du marqueur dans la viewport zoomée
- Marqueur = pastille (couleur événement de `VITE_EVENT_COLOR`) avec le
  numéro de stand en blanc dessus. Exposants inactifs en gris désaturé.
- Tap sur marqueur → drawer remontant du bas avec mini-fiche : nom,
  entreprise, stand, bouton "Voir la fiche complète" (vers `/e/:uuid`)
- Pinch-to-zoom + pan via `react-zoom-pan-pinch`. Zoom minimum = "fit",
  zoom maximum = 4x.
- Si `?highlight=:uuid` dans l'URL : ouvre le bon plan, fait clignoter,
  ouvre le drawer.

### Intégration sur la fiche publique `/e/:uuid`

Sur `PublicCard.tsx`, sous l'info stand, ajouter un bouton :
**📍 Voir sur le plan** → `/plan?highlight=:uuid`

Visible uniquement si l'exposant a un `plan_id` défini.

## UX admin

### Page `/admin/plans`

Liste des plans existants (cartes avec preview de l'image) :

```
┌──────────────────────────────────────┐
│ Plans                  [+ Nouveau]   │
├──────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐              │
│ │[preview]│ │[preview]│              │
│ │ Halle 1 │ │ Ext.    │              │
│ │ 12 exp. │ │ 4 exp.  │              │
│ │ [Édit.] │ │ [Édit.] │              │
│ └─────────┘ └─────────┘              │
└──────────────────────────────────────┘
```

Modal "Nouveau plan" : nom + upload image, valide → crée le plan puis
redirige vers l'éditeur.

### Éditeur `/admin/plans/:id`

```
┌────────────────────────────────────────────┐
│ ← Halle 1                    [Renommer]    │
│                              [Remplacer img]│
│                              [Supprimer]   │
├──────────────────────────┬─────────────────┤
│                          │ À PLACER (4)    │
│   [Image du plan]        │                 │
│    • 12   • 7            │ ☐ Jean Dupont   │
│        • 3               │ ☐ Marie Martin  │
│                          │ ☐ Paul Favre    │
│                          │ ...             │
│                          │                 │
│                          │ SUR CE PLAN (8) │
│                          │ ☑ Stand 12...   │
│                          │ ☑ Stand 7...    │
└──────────────────────────┴─────────────────┘
```

**Mécanique de placement (simple, pas de drag-and-drop pur) :**

1. Clic sur un exposant dans la sidebar "À PLACER" → exposant en mode
   "placement actif" (surligné)
2. Clic sur le plan → place le marqueur à cette position, calcule `x%`
   et `y%`, appel API
3. Pour repositionner un marqueur existant : drag (mousedown → mousemove
   → mouseup) ou touch équivalent
4. Pour détacher : clic sur marqueur → bouton "Retirer du plan" dans un
   petit popover

**Responsive admin :** sur mobile, la sidebar devient un drawer en bas
qu'on ouvre via un FAB "Liste des exposants".

## Composants frontend

```
frontend/src/
├── pages/
│   ├── public/
│   │   └── PlanView.tsx           ← /plan
│   └── admin/
│       ├── PlanList.tsx           ← /admin/plans
│       └── PlanEditor.tsx         ← /admin/plans/:id
├── components/
│   ├── PlanCanvas.tsx             ← image + marqueurs absolus, zoom/pan
│   ├── PlanMarker.tsx             ← pastille avec n° de stand
│   ├── PlanExposantDrawer.tsx     ← drawer mobile public
│   └── PlanEditorSidebar.tsx      ← sidebar admin "À placer / Sur ce plan"
└── api.ts                         ← ajouts: api.plans.{list,get,create,update,...}
```

`PlanCanvas` est l'élément central, réutilisé en mode lecture (public) et
édition (admin) via une prop `mode: 'view' | 'edit'`.

## Décisions techniques

### Zoom et pan

Bibliothèque : `react-zoom-pan-pinch`. Léger (~15 kB gzip), supporte le
pinch-to-zoom mobile + pan, et permet de programmer le zoom (centrer sur
un marqueur via la barre de recherche).

Alternatives écartées :
- `panzoom` (lib vanilla) : pas d'API React native, plus de glue à écrire
- Implémentation manuelle avec `transform: scale + translate` : maintenance
  élevée, gestion tactile compliquée

### Positionnement des marqueurs

```tsx
<div style={{
  position: 'absolute',
  left: `${pos_x}%`,
  top:  `${pos_y}%`,
  transform: 'translate(-50%, -50%)',
}}>
```

Le `translate(-50%, -50%)` centre la pastille sur la position. Combiné au
positionnement en %, ça reste exact quelle que soit la taille rendue de
l'image.

### Drag pour repositionner (admin)

Pas de bibliothèque dédiée. Implémentation native :

1. `mousedown` / `touchstart` sur le marqueur → bascule en mode drag
2. `mousemove` / `touchmove` : calcule la position du curseur en %
   relatif au container de l'image (`getBoundingClientRect`)
3. `mouseup` / `touchend` : appel API `PUT /api/exposants/:id/position`

Garde l'état local optimiste pour le rendu pendant le drag.

### Magic bytes pour upload de plan

Réutilise `isImageMagicBytes` de `routes/exposants.ts` — pertinent de
factoriser dans `services/imageValidation.ts` quand on le copie. À faire
dans le plan d'implémentation.

## Cas d'erreur et edge cases

- **Plan supprimé alors qu'on est dessus (admin) :** redirige vers
  `/admin/plans` avec toast d'erreur
- **Image de plan introuvable côté frontend (404) :** affiche un état
  vide "Image du plan indisponible, contacter l'admin"
- **Exposant inactif placé sur un plan :** affiché en gris désaturé,
  cliquable mais le drawer indique "Stand actuellement fermé"
- **Position invalide (>100 ou <0) reçue par l'API :** 400 avec message
  explicite
- **Plan_id référencé n'existe pas :** 400 avec message
- **Upload d'image non-image (magic bytes fail) :** 400 "Type de fichier
  non valide"

## Performance et coûts

- Image plan : 10 MB max, mais on recommande <2 MB en pratique
  (documentation utilisateur). Le frontend pourrait optimiser en
  utilisant `<img srcset>` mais YAGNI pour le moment.
- Liste publique des marqueurs : on retourne uniquement les champs
  nécessaires au rendu (`id, uuid, nom, entreprise, stand, statut,
  pos_x, pos_y`). Pas de description/téléphone/email → réduit la
  taille du JSON.
- Cache navigateur sur les images de plan : `Cache-Control: public,
  max-age=86400` côté nginx pour `/uploads/plans/*`.

## Sécurité

- Endpoints admin protégés par `verifyJWT + requireAdmin` (déjà en place)
- Upload validé par magic bytes + taille max
- Pas de SSRF (les images sont uploadées, pas fetchées depuis une URL
  externe pour les plans — contrairement à `logo_url` des exposants)
- Endpoint public `/api/plans/*` rate-limité avec le `publicLimiter`
  existant

## Tests

- Unit backend : validation positions (0-100), magic bytes, suppression
  en cascade des marqueurs quand plan supprimé
- Unit frontend : composant `PlanCanvas` en mode `view` (rendu
  marqueurs), en mode `edit` (drag), `PlanMarker` (états actif/inactif/
  highlight)
- Tests d'intégration : flow complet créer plan → upload image →
  placer exposant → consulter côté public

## Hors scope (pour cette feature)

- Catégories d'exposants et couleurs de marqueurs par catégorie
- Mode "favoris" / itinéraire personnalisé
- Légende sur le plan
- Édition de SVG vectoriel
- Multi-événement (plusieurs éditions du Comptoir)
- Notifications aux exposants en cas de déplacement

Ces points sont des évolutions futures explicites.
