export type BoatType = 'paddle' | 'oar' | 'combined'
export type GuideRole = 'guide' | 'trip_leader' | 'guide_instructor' | 'private'

export interface Profile {
  id: string
  first_name: string
  last_name: string
  middle_name: string | null
  date_of_birth: string | null
  company_name: string
  rol_license: string
  is_admin: boolean
  created_at: string
}

export interface LogEntry {
  id: string
  user_id: string
  date: string
  river: string
  put_in: string
  take_out: string
  boat_type: BoatType
  role: GuideRole
  hours: number
  miles: number
  company_name: string
  rol_license: string
  notes: string | null
  created_at: string
  profiles?: Profile
}

export interface Totals {
  miles_as_guide: number
  miles_as_trip_leader: number
  miles_as_guide_instructor: number
  miles_private: number
  hours_as_guide: number
  hours_as_trip_leader: number
  hours_as_guide_instructor: number
  hours_private: number
}
