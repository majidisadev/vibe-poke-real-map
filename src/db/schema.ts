export interface Pokemon {
  id: number
  name: string
  number: number
  type1: string
  type2?: string
  image_url?: string
  description?: string
  generation?: number
  habitat?: string
  hp?: number
  attack?: number
  defense?: number
  special_attack?: number
  special_defense?: number
  speed?: number
}

export interface Region {
  id: number
  name: string
  code: string
  boundary: string // GeoJSON string
  color: string
}

export interface PokemonRegion {
  pokemon_id: number
  region_id: number
}

export interface UserPokemon {
  pokemon_id: number
  caught: boolean
  caught_date?: string
  notes?: string
  games?: string[] // Array of game IDs from MAIN_SERIES_GAMES
}

