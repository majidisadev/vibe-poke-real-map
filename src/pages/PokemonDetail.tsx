import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPokemonById, getPokemonByNumber, getPokemonRegions, getAllRegions, getUserPokemon, setUserPokemonCaught, setUserPokemonGames } from '../services/dbService'
import { Pokemon, Region, UserPokemon } from '../db/schema'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { MAIN_SERIES_GAMES } from '../db/pokemonGames'
import './PokemonDetail.css'

interface EvolutionDetails {
  trigger?: string
  level?: number
  item?: string
  timeOfDay?: string
  location?: string
  minHappiness?: number
  minBeauty?: number
  minAffection?: number
  knownMove?: string
  knownMoveType?: string
  partySpecies?: string
  partyType?: string
  tradeSpecies?: string
  needsOverworldRain?: boolean
  turnUpsideDown?: boolean
  relativePhysicalStats?: number
  gender?: number
  needsTrade?: boolean
}

interface EvolutionChain {
  id: number
  name: string
  number: number
  image_url?: string
  evolutionDetails?: EvolutionDetails
}

function PokemonDetail() {
  const { id } = useParams<{ id: string }>()
  const [pokemon, setPokemon] = useState<Pokemon | null>(null)
  const [regions, setRegions] = useState<Region[]>([])
  const [pokemonRegions, setPokemonRegions] = useState<number[]>([])
  const [userData, setUserData] = useState<UserPokemon | null>(null)
  const [loading, setLoading] = useState(true)
  const [nextPokemonId, setNextPokemonId] = useState<number | null>(null)
  const [prevPokemonId, setPrevPokemonId] = useState<number | null>(null)
  const [gamesDropdownOpen, setGamesDropdownOpen] = useState(false)
  const gamesDropdownRef = useRef<HTMLDivElement>(null)
  const [evolutionChain, setEvolutionChain] = useState<EvolutionChain[]>([])

  useEffect(() => {
    if (id) {
      loadData(parseInt(id))
    }
  }, [id])

  async function fetchEvolutionChain(pokemonNumber: number): Promise<EvolutionChain[]> {
    try {
      // Fetch species data to get evolution chain URL
      const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonNumber}`)
      if (!speciesResponse.ok) return []
      
      const speciesData = await speciesResponse.json()
      const evolutionChainUrl = speciesData.evolution_chain?.url
      if (!evolutionChainUrl) return []

      // Fetch evolution chain data
      const chainResponse = await fetch(evolutionChainUrl)
      if (!chainResponse.ok) return []
      
      const chainData = await chainResponse.json()
      
      // Parse evolution chain recursively with details
      interface ChainNode {
        speciesId: number
        evolutionDetails?: EvolutionDetails // Details for evolving TO this Pokemon
      }
      
      const chainNodes: ChainNode[] = []
      
      function parseChain(chainLink: any) {
        if (!chainLink?.species) return
        
        const speciesUrl = chainLink.species.url
        const speciesIdMatch = speciesUrl.match(/\/pokemon-species\/(\d+)\//)
        if (!speciesIdMatch) return
        
        const speciesId = parseInt(speciesIdMatch[1])
        
        // Parse evolution details (conditions to evolve TO this Pokemon)
        let evolutionDetails: EvolutionDetails | undefined = undefined
        if (chainLink.evolution_details && chainLink.evolution_details.length > 0) {
          const details = chainLink.evolution_details[0]
          evolutionDetails = {
            trigger: details.trigger?.name || undefined,
            level: details.min_level || undefined,
            item: details.item?.name ? capitalizeFirst(details.item.name.replace(/-/g, ' ')) : undefined,
            timeOfDay: details.time_of_day ? details.time_of_day : undefined,
            location: details.location?.name ? capitalizeFirst(details.location.name.replace(/-/g, ' ')) : undefined,
            minHappiness: details.min_happiness || undefined,
            minBeauty: details.min_beauty || undefined,
            minAffection: details.min_affection || undefined,
            knownMove: details.known_move?.name ? capitalizeFirst(details.known_move.name.replace(/-/g, ' ')) : undefined,
            knownMoveType: details.known_move_type?.name ? capitalizeFirst(details.known_move_type.name) : undefined,
            partySpecies: details.party_species?.name ? capitalizeFirst(details.party_species.name.replace(/-/g, ' ')) : undefined,
            partyType: details.party_type?.name ? capitalizeFirst(details.party_type.name) : undefined,
            tradeSpecies: details.trade_species?.name ? capitalizeFirst(details.trade_species.name.replace(/-/g, ' ')) : undefined,
            needsOverworldRain: details.needs_overworld_rain || false,
            turnUpsideDown: details.turn_upside_down || false,
            relativePhysicalStats: details.relative_physical_stats || undefined,
            gender: details.gender || undefined,
            needsTrade: details.trigger?.name === 'trade'
          }
        }
        
        chainNodes.push({
          speciesId,
          evolutionDetails
        })
        
        // Recursively parse evolution details
        if (chainLink.evolves_to && chainLink.evolves_to.length > 0) {
          chainLink.evolves_to.forEach((evolution: any) => {
            parseChain(evolution)
          })
        }
      }
      
      parseChain(chainData.chain)
      
      // Fetch Pokemon data for each evolution to get actual IDs
      const chain: EvolutionChain[] = []
      for (const node of chainNodes) {
        try {
          const evoPokemon = await getPokemonByNumber(node.speciesId)
          if (evoPokemon) {
            chain.push({
              id: evoPokemon.id,
              name: evoPokemon.name,
              number: evoPokemon.number,
              image_url: evoPokemon.image_url,
              evolutionDetails: node.evolutionDetails
            })
          }
        } catch (error) {
          console.warn(`Could not fetch Pokemon ${node.speciesId} from database:`, error)
        }
      }
      
      return chain
    } catch (error) {
      console.error('Error fetching evolution chain:', error)
      return []
    }
  }

  function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  function formatEvolutionDetails(details: EvolutionDetails): string {
    const conditions: string[] = []
    
    if (details.needsTrade) {
      conditions.push('Trade')
      if (details.tradeSpecies) {
        conditions.push(`with ${details.tradeSpecies}`)
      }
    } else if (details.trigger === 'level-up') {
      if (details.level) {
        conditions.push(`Level ${details.level}`)
      } else {
        conditions.push('Level Up')
      }
    } else if (details.trigger === 'use-item') {
      if (details.item) {
        conditions.push(`Use ${details.item}`)
      } else {
        conditions.push('Use Item')
      }
    } else if (details.trigger === 'shed') {
      conditions.push('Shed (Level 20 with empty party and Poké Ball)')
    } else {
      if (details.trigger) {
        conditions.push(capitalizeFirst(details.trigger.replace(/-/g, ' ')))
      }
    }
    
    if (details.minHappiness) {
      conditions.push(`Happiness ≥ ${details.minHappiness}`)
    }
    
    if (details.minAffection) {
      conditions.push(`Affection ≥ ${details.minAffection}`)
    }
    
    if (details.minBeauty) {
      conditions.push(`Beauty ≥ ${details.minBeauty}`)
    }
    
    if (details.knownMove) {
      conditions.push(`Knows ${details.knownMove}`)
    }
    
    if (details.knownMoveType) {
      conditions.push(`Knows ${details.knownMoveType}-type move`)
    }
    
    if (details.partySpecies) {
      conditions.push(`With ${details.partySpecies} in party`)
    }
    
    if (details.partyType) {
      conditions.push(`With ${details.partyType}-type in party`)
    }
    
    if (details.location) {
      conditions.push(`at ${details.location}`)
    }
    
    if (details.timeOfDay && details.timeOfDay !== '') {
      conditions.push(details.timeOfDay === 'day' ? 'during day' : details.timeOfDay === 'night' ? 'during night' : `during ${details.timeOfDay}`)
    }
    
    if (details.needsOverworldRain) {
      conditions.push('while raining')
    }
    
    if (details.turnUpsideDown) {
      conditions.push('turn console upside down')
    }
    
    if (details.relativePhysicalStats !== undefined) {
      if (details.relativePhysicalStats === 1) {
        conditions.push('Attack > Defense')
      } else if (details.relativePhysicalStats === -1) {
        conditions.push('Attack < Defense')
      } else {
        conditions.push('Attack = Defense')
      }
    }
    
    if (details.gender !== undefined) {
      conditions.push(details.gender === 1 ? 'Female' : 'Male')
    }
    
    return conditions.length > 0 ? conditions.join(' • ') : 'Unknown'
  }

  async function loadData(pokemonId: number) {
    setLoading(true)
    try {
      const [pokemonData, allRegions, regionIds, userPokemonData] = await Promise.all([
        getPokemonById(pokemonId),
        getAllRegions(),
        getPokemonRegions(pokemonId),
        getUserPokemon(pokemonId)
      ])

      setPokemon(pokemonData)
      setRegions(allRegions)
      setPokemonRegions(regionIds)
      setUserData(userPokemonData)

      // Load evolution chain
      if (pokemonData) {
        const chain = await fetchEvolutionChain(pokemonData.number)
        setEvolutionChain(chain)
      }

      // Load next and previous pokemon
      if (pokemonData) {
        const nextNumber = pokemonData.number + 1
        const prevNumber = pokemonData.number - 1
        
        if (nextNumber <= 1025) {
          const nextPokemon = await getPokemonByNumber(nextNumber)
          if (nextPokemon) {
            setNextPokemonId(nextPokemon.id)
          } else {
            setNextPokemonId(null)
          }
        } else {
          setNextPokemonId(null)
        }

        if (prevNumber >= 1) {
          const prevPokemon = await getPokemonByNumber(prevNumber)
          if (prevPokemon) {
            setPrevPokemonId(prevPokemon.id)
          } else {
            setPrevPokemonId(null)
          }
        } else {
          setPrevPokemonId(null)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleCaught() {
    if (!pokemon) return
    
    const newCaughtStatus = !userData?.caught
    await setUserPokemonCaught(pokemon.id, newCaughtStatus)
    
    const updatedUserData = await getUserPokemon(pokemon.id)
    setUserData(updatedUserData)
  }

  async function toggleGame(gameId: string) {
    if (!pokemon || !userData?.caught) return

    const currentGames = userData.games || []
    const newGames = currentGames.includes(gameId)
      ? currentGames.filter(id => id !== gameId)
      : [...currentGames, gameId]

    await setUserPokemonGames(pokemon.id, newGames)
    
    const updatedUserData = await getUserPokemon(pokemon.id)
    setUserData(updatedUserData)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (gamesDropdownRef.current && !gamesDropdownRef.current.contains(event.target as Node)) {
        setGamesDropdownOpen(false)
      }
    }

    if (gamesDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [gamesDropdownOpen])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!pokemon) {
    return (
      <div className="space-y-4">
        <p className="text-lg">Pokemon not found</p>
        <Button asChild>
          <Link to="/pokemon">Back to Pokemon List</Link>
        </Button>
      </div>
    )
  }

  const isCaught = userData?.caught || false

  // Prepare data for radar chart
  const statsData = pokemon && pokemon.hp !== undefined ? [
    { stat: 'HP', value: pokemon.hp || 0, fullMark: 255 },
    { stat: 'Attack', value: pokemon.attack || 0, fullMark: 255 },
    { stat: 'Defense', value: pokemon.defense || 0, fullMark: 255 },
    { stat: 'Sp. Atk', value: pokemon.special_attack || 0, fullMark: 255 },
    { stat: 'Sp. Def', value: pokemon.special_defense || 0, fullMark: 255 },
    { stat: 'Speed', value: pokemon.speed || 0, fullMark: 255 },
  ] : []

  return (
    <div className="pokemon-detail max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild>
          <Link to="/pokemon">← Back to Pokemon List</Link>
        </Button>
        <div className="flex gap-2">
          {prevPokemonId && (
            <Button variant="outline" asChild>
              <Link to={`/pokemon/${prevPokemonId}`}>← Previous</Link>
            </Button>
          )}
          {nextPokemonId && (
            <Button variant="outline" asChild>
              <Link to={`/pokemon/${nextPokemonId}`}>Next →</Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 p-6">
          <div className="text-center">
            <img
              src={pokemon.image_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`}
              alt={pokemon.name}
              className="w-full max-w-[300px] mx-auto mb-6 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Pokemon'
              }}
            />
            <div className="space-y-4">
              <Button
                className={cn(
                  "w-full text-lg py-6",
                  isCaught
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "border-2"
                )}
                onClick={toggleCaught}
              >
                {isCaught ? '✓ Caught' : '○ Not Caught'}
              </Button>
              {userData?.caught_date && (
                <p className="text-sm text-muted-foreground">
                  Caught on: {new Date(userData.caught_date).toLocaleDateString()}
                </p>
              )}
              {isCaught && (
                <div className="space-y-2">
                  <div className="relative" ref={gamesDropdownRef}>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setGamesDropdownOpen(!gamesDropdownOpen)}
                    >
                      {userData?.games && userData.games.length > 0
                        ? `Games (${userData.games.length})`
                        : 'Select Games'}
                    </Button>
                    {gamesDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-background border border-input rounded-md shadow-lg max-h-[400px] overflow-y-auto">
                        <div className="p-2">
                          {MAIN_SERIES_GAMES.map((game) => {
                            const isSelected = userData?.games?.includes(game.id) || false
                            return (
                              <label
                                key={game.id}
                                className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleGame(game.id)}
                                  className="w-4 h-4"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{game.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    Gen {game.generation} • {game.platform} • {game.year}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {userData?.games && userData.games.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {userData.games.map((gameId) => {
                        const game = MAIN_SERIES_GAMES.find(g => g.id === gameId)
                        if (!game) return null
                        return (
                          <Badge key={gameId} variant="secondary" className="text-xs">
                            {game.name}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-baseline gap-4 mb-4">
                <span className="text-xl text-muted-foreground font-semibold">#{pokemon.number}</span>
                <h1 className="text-4xl font-bold capitalize">{pokemon.name}</h1>
              </div>

              <div className="flex gap-3 mb-4 flex-wrap">
                <span className={`type type-${pokemon.type1.toLowerCase()}`}>
                  {pokemon.type1}
                </span>
                {pokemon.type2 && (
                  <span className={`type type-${pokemon.type2.toLowerCase()}`}>
                    {pokemon.type2}
                  </span>
                )}
                {pokemon.generation && (
                  <Badge variant="outline" className="px-3 py-1">
                    Generation {pokemon.generation}
                  </Badge>
                )}
                {pokemon.habitat && (
                  <Badge variant="outline" className="px-3 py-1">
                    {pokemon.habitat}
                  </Badge>
                )}
              </div>
            </div>

            {pokemon.description && (
              <div>
                <h3 className="text-xl font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{pokemon.description}</p>
              </div>
            )}

            {statsData.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Base Stats</h3>
                <div className="w-full h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={statsData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="stat" />
                      <PolarRadiusAxis angle={90} domain={[0, 255]} />
                      <Radar
                        name="Stats"
                        dataKey="value"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">HP</p>
                    <p className="text-lg font-semibold">{pokemon.hp}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Attack</p>
                    <p className="text-lg font-semibold">{pokemon.attack}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Defense</p>
                    <p className="text-lg font-semibold">{pokemon.defense}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Sp. Atk</p>
                    <p className="text-lg font-semibold">{pokemon.special_attack}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Sp. Def</p>
                    <p className="text-lg font-semibold">{pokemon.special_defense}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Speed</p>
                    <p className="text-lg font-semibold">{pokemon.speed}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xl font-semibold mb-4">Regions ({pokemonRegions.length})</h3>
              {pokemonRegions.length === 0 ? (
                <p className="text-muted-foreground italic mb-2">
                  This Pokemon is not assigned to any region yet.
                  <br />
                  <Link to="/regions" className="text-primary hover:underline">
                    Go to Region Manager
                  </Link> to assign regions.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {regions
                    .filter(r => pokemonRegions.includes(r.id))
                    .map(region => (
                      <Badge
                        key={region.id}
                        className="text-white px-4 py-2 text-sm font-semibold"
                        style={{ backgroundColor: region.color }}
                      >
                        {region.name}
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Evolution Lines</h3>
              {evolutionChain.length === 0 ? (
                <p className="text-muted-foreground italic">
                  This Pokemon has no evolution chain.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {evolutionChain.map((evo, index) => {
                    const isCurrentPokemon = evo.number === pokemon?.number
                    
                    return (
                      <div key={evo.id} className="flex flex-col gap-2">
                        <Link
                          to={`/pokemon/${evo.id}`}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-md w-full",
                            isCurrentPokemon
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div className="relative">
                            <img
                              src={evo.image_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.number}.png`}
                              alt={evo.name}
                              className="w-20 h-20 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.number}.png`
                              }}
                            />
                            {isCurrentPokemon && (
                              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
                                Current
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm text-muted-foreground font-semibold">#{evo.number}</span>
                              <h4 className="text-lg font-semibold capitalize">{evo.name}</h4>
                            </div>
                          </div>
                        </Link>
                        {index < evolutionChain.length - 1 && (
                          <div className="flex flex-col items-center gap-2 py-2">
                            {evolutionChain[index + 1]?.evolutionDetails && (
                              <div className="text-center max-w-md w-full">
                                <p className="text-xs font-medium text-foreground px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md">
                                  {formatEvolutionDetails(evolutionChain[index + 1].evolutionDetails!)}
                                </p>
                              </div>
                            )}
                            <svg
                              className="w-6 h-6 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 14l-7 7m0 0l-7-7m7 7V3"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default PokemonDetail
