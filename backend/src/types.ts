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
  plan_id: number | null
  pos_x: number | null
  pos_y: number | null
  created_at: Date
  updated_at: Date
}

export interface Plan {
  id: number
  nom: string
  image_file: string
  ordre: number
  created_at: Date
  updated_at: Date
}

export interface User {
  id: number
  email: string
  role: 'admin' | 'staff'
}
