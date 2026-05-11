export interface Exposant {
  id?: number
  uuid: string
  nom: string
  entreprise: string | null
  stand: string | null
  email: string | null
  telephone: string | null
  site_web: string | null
  description: string | null
  logo_url: string | null
  logo_file: string | null
  statut: 'actif' | 'inactif'
}

export interface AuthUser {
  id: number
  email: string
  role: 'admin' | 'staff'
}

export interface UserProfile {
  id: number
  email: string
  role: 'admin' | 'staff'
  created_at: string
}
