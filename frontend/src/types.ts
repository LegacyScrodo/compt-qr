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
  plan_id?: number | null
  pos_x?: number | null
  pos_y?: number | null
}

export interface Plan {
  id: number
  nom: string
  image_file: string
  ordre: number
}

export interface PlanWithExposants extends Plan {
  exposants: Array<Pick<Exposant, 'id' | 'uuid' | 'nom' | 'entreprise' | 'stand' | 'statut' | 'pos_x' | 'pos_y'>>
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
