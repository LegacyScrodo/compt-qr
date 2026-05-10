export interface Exposant {
  id: number
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
  created_at: Date
  updated_at: Date
}

export interface User {
  id: number
  email: string
  role: 'admin' | 'staff'
}
