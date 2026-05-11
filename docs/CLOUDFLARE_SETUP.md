# Configuration Cloudflare — Géo-bloquage admin/staff

Ce guide configure Cloudflare devant ComptQR pour :
- **Géo-bloquer** l'accès aux routes admin/staff/login depuis hors-Suisse
- **Masquer l'IP** du VPS (anti-scan, anti-DDoS basique)
- **Forcer** tout le trafic à passer par Cloudflare (verrouillage UFW)

La page publique `/e/:uuid` (vue exposant via QR) **reste accessible mondialement** — un visiteur frontalier français qui scanne un badge ne sera pas bloqué.

---

## Étape 1 — Créer le compte Cloudflare

1. Compte gratuit sur https://cloudflare.com
2. **Add a Site** → `compt-qr.ch`
3. Choisir le plan **Free**
4. Cloudflare scanne tes enregistrements DNS — vérifier qu'il y a bien :
   ```
   A   compt-qr.ch     <IP_VPS>     Proxied (nuage orange)
   ```
5. **Important** : le nuage doit être **orange** (proxy actif). Si gris, cliquer dessus pour activer.

---

## Étape 2 — Changer les nameservers

1. Cloudflare affiche 2 nameservers à utiliser (ex. `bob.ns.cloudflare.com`)
2. Chez ton registrar (où tu as acheté `compt-qr.ch`), remplace les NS par ceux de Cloudflare
3. Attendre la propagation (5 min à 24 h)
4. Cloudflare envoie un email "Your domain is active" quand c'est OK

Vérifier avec :
```bash
dig compt-qr.ch NS +short
```

---

## Étape 3 — SSL/TLS strict

Dans Cloudflare → ton domaine → **SSL/TLS** :

- **Overview** : mode **Full (strict)**
  > Cloudflare valide le certificat Let's Encrypt de ton VPS. Plus sécurisé que "Full".
- **Edge Certificates** :
  - **Always Use HTTPS** → ON
  - **HTTP Strict Transport Security (HSTS)** → Enable (max-age 6 months, includeSubDomains)
  - **Minimum TLS Version** → TLS 1.2
  - **Opportunistic Encryption** → ON
  - **Automatic HTTPS Rewrites** → ON

---

## Étape 4 — Règle WAF de géo-bloquage

Dans Cloudflare → ton domaine → **Security** → **WAF** → **Custom rules** → **Create rule**

**Configuration :**

| Champ | Valeur |
|-------|--------|
| Rule name | `Block non-CH admin access` |

**Expression (Edit expression → utiliser l'éditeur visuel ou coller ceci) :**

```
(
  starts_with(http.request.uri.path, "/admin") or
  starts_with(http.request.uri.path, "/staff") or
  starts_with(http.request.uri.path, "/login") or
  starts_with(http.request.uri.path, "/api/auth") or
  starts_with(http.request.uri.path, "/api/users")
) and ip.geoip.country ne "CH"
```

> Notes :
> - `/e/:uuid` (public) et `/api/exposants/:uuid` (lookup public) ne sont **pas** dans la liste — accessibles mondialement ✅
> - `/api/auth/refresh` est bloqué — pas grave, un admin hors-Suisse ne pourra pas se reconnecter, mais c'est l'intention

| Champ | Valeur |
|-------|--------|
| Action | **Block** |
| Custom response | (optionnel) HTTP 403, body "Accès réservé — restriction géographique" |

**Deploy.**

---

## Étape 5 — Verrouiller UFW sur les IPs Cloudflare

À ce stade, n'importe qui peut encore atteindre `http://<IP_VPS>` directement et contourner Cloudflare. On ferme cette porte.

Sur le VPS :

```bash
cd ~/compt-qr
git pull
sudo ./scripts/setup-cloudflare-ufw.sh
```

Le script :
1. Récupère les ranges IP Cloudflare officiels (https://www.cloudflare.com/ips-v4)
2. Supprime les règles UFW `80/tcp` et `443/tcp` génériques
3. Ajoute des règles `allow from <CF_RANGE> to any port 80/443`
4. Reload UFW

**Vérifier** :
```bash
# Depuis ta machine locale (pas le VPS)
curl -I https://compt-qr.ch       # → 200 OK (passe par Cloudflare)
curl -I http://<IP_VPS>           # → connection timed out (bloqué)
```

---

## Étape 6 — Mettre à jour Traefik (déjà fait dans docker-compose.yml)

Le `docker-compose.yml` du repo a déjà les `trustedIPs` Cloudflare configurés sur les entrypoints `web` et `websecure`. Ceci permet à Traefik de récupérer la **vraie IP du client** via `X-Forwarded-For` (utile pour les logs et le rate-limiter).

Sur le VPS, juste appliquer :
```bash
cd ~/compt-qr
docker compose up -d
```

---

## Étape 7 — Tester

1. **Depuis Suisse (toi)** :
   - https://compt-qr.ch/login → ✅ accessible
   - https://compt-qr.ch/admin → ✅ accessible
   - https://compt-qr.ch/e/<uuid> → ✅ accessible

2. **Depuis hors Suisse** (utiliser un VPN type ProtonVPN avec serveur français) :
   - https://compt-qr.ch/login → ❌ 403 Cloudflare
   - https://compt-qr.ch/admin → ❌ 403 Cloudflare
   - https://compt-qr.ch/e/<uuid> → ✅ accessible (page publique exposant)

3. **Tentative bypass direct sur IP** :
   - `curl http://<IP_VPS>` → ❌ timeout (UFW bloque)

---

## Maintenance

**Tous les 6 mois** : relancer le script UFW pour récupérer les nouveaux ranges Cloudflare :
```bash
sudo ~/compt-qr/scripts/setup-cloudflare-ufw.sh
```

**Vérifier la règle WAF active** : Cloudflare → Security → WAF → Custom rules. Le compteur de "Triggered" t'indique combien de tentatives sont bloquées.

**Logs Cloudflare** : Cloudflare → Analytics & Logs → Security → Events. Tu peux y voir le pays d'origine des tentatives bloquées.

---

## Si tu veux temporairement autoriser un admin hors-Suisse

Cas typique : tu pars en France et tu dois accéder à l'admin.

**Option A** : utiliser un VPN qui te redonne une IP suisse (ProtonVPN, Mullvad, etc.)

**Option B** : modifier temporairement la règle WAF pour ajouter ton IP :
```
... and ip.geoip.country ne "CH" and ip.src ne <TON_IP_PUBLIQUE>
```
N'oublie pas de retirer cette exception après usage.

---

## Désactiver le géo-bloquage (rollback)

Cloudflare → Security → WAF → Custom rules → désactiver la règle ("Off")
