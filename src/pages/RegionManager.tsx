import { useEffect, useState } from 'react'
import { getAllPokemon, getAllRegions, getPokemonRegions, setPokemonRegions } from '../services/dbService'
import { Pokemon, Region } from '../db/schema'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'
import './RegionManager.css'

function RegionManager() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null)
  const [pokemonRegions, setPokemonRegionsState] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [generationFilter, setGenerationFilter] = useState<number | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedPokemon) {
      loadPokemonRegions(selectedPokemon.id)
    }
  }, [selectedPokemon])

  async function loadData() {
    setLoading(true)
    try {
      const [pokemonList, regionsList] = await Promise.all([
        getAllPokemon(),
        getAllRegions()
      ])
      setPokemon(pokemonList.sort((a, b) => a.number - b.number))
      setRegions(regionsList)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique generations from pokemon list
  const availableGenerations = Array.from(new Set(pokemon.map(p => p.generation).filter((g): g is number => g !== undefined))).sort((a, b) => a - b)

  // Filter pokemon based on generation and search
  const filteredPokemon = pokemon.filter(p => {
    const matchesSearch = searchTerm === '' || 
                         p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.number.toString().includes(searchTerm)
    const matchesGeneration = generationFilter === 'all' || p.generation === generationFilter
    return matchesSearch && matchesGeneration
  })

  async function loadPokemonRegions(pokemonId: number) {
    const regionIds = await getPokemonRegions(pokemonId)
    setPokemonRegionsState(regionIds)
  }

  async function toggleRegion(regionId: number) {
    if (!selectedPokemon) return

    const newRegions = pokemonRegions.includes(regionId)
      ? pokemonRegions.filter(id => id !== regionId)
      : [...pokemonRegions, regionId]

    setPokemonRegionsState(newRegions)
    await setPokemonRegions(selectedPokemon.id, newRegions)
  }

  const getTypeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC',
    }
    return colors[type.toLowerCase()] || '#A8A878'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="region-manager max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Region Manager</h1>
        <p className="text-muted-foreground text-lg">Assign Pokemon to UN Geoscheme Regions</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8 p-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Select Pokemon</h2>
            <div className="flex flex-col gap-3 mb-4">
              <Input
                type="text"
                placeholder="Search by name or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                value={generationFilter}
                onChange={(e) => setGenerationFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-4 py-2 border rounded-md bg-background text-foreground"
              >
                <option value="all">All Generations</option>
                {availableGenerations.map(gen => (
                  <option key={gen} value={gen}>Generation {gen}</option>
                ))}
              </select>
            </div>
            <div className="pokemon-list max-h-[600px] overflow-y-auto">
              {filteredPokemon.map((p) => (
                <Button
                  key={p.id}
                  variant={selectedPokemon?.id === p.id ? 'default' : 'outline'}
                  className={cn(
                    "w-full justify-start text-left h-auto py-3 px-4 mb-2",
                    selectedPokemon?.id === p.id && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setSelectedPokemon(p)}
                >
                  <span className="text-sm text-muted-foreground min-w-[50px]">#{p.number}</span>
                  <span className="capitalize">{p.name}</span>
                </Button>
              ))}
              {filteredPokemon.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No Pokemon found</p>
              )}
            </div>
          </div>

          <div className="min-h-[400px]">
            {selectedPokemon ? (
              <>
                {/* Pokemon Info Section */}
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                      {/* Pokemon Image */}
                      {selectedPokemon.image_url && (
                        <div className="flex-shrink-0">
                          <img
                            src={selectedPokemon.image_url}
                            alt={selectedPokemon.name}
                            className="w-48 h-48 object-contain"
                          />
                        </div>
                      )}
                      
                      {/* Pokemon Details */}
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex items-baseline gap-4 justify-center md:justify-start mb-4">
                          <h2 className="text-2xl font-bold capitalize">{selectedPokemon.name}</h2>
                          <span className="text-lg text-muted-foreground font-semibold">#{selectedPokemon.number}</span>
                        </div>
                        
                        {/* Types */}
                        <div className="flex gap-2 justify-center md:justify-start mb-4">
                          <Badge
                            style={{
                              backgroundColor: getTypeColor(selectedPokemon.type1),
                              color: 'white',
                              border: 'none'
                            }}
                            className="px-3 py-1 text-sm font-semibold"
                          >
                            {selectedPokemon.type1}
                          </Badge>
                          {selectedPokemon.type2 && (
                            <Badge
                              style={{
                                backgroundColor: getTypeColor(selectedPokemon.type2),
                                color: 'white',
                                border: 'none'
                              }}
                              className="px-3 py-1 text-sm font-semibold"
                            >
                              {selectedPokemon.type2}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Habitat */}
                        {selectedPokemon.habitat && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Habitat: </span>
                            <span className="font-semibold capitalize">{selectedPokemon.habitat}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <h3 className="text-xl font-semibold mb-4">Select Regions</h3>
                <div className="regions-grid mb-6">
                  {regions.map((region) => {
                    const isSelected = pokemonRegions.includes(region.id)
                    return (
                      <Card
                        key={region.id}
                        className={cn(
                          "region-card cursor-pointer transition-all hover:shadow-lg",
                          isSelected && "ring-2 ring-primary"
                        )}
                        style={{
                          borderColor: region.color,
                          backgroundColor: isSelected ? `${region.color}20` : 'transparent'
                        }}
                        onClick={() => toggleRegion(region.id)}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: region.color }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{region.name}</h3>
                          <p className="text-sm text-muted-foreground font-semibold">{region.code}</p>
                        </div>
                        <div className={cn(
                          "text-2xl flex-shrink-0",
                          isSelected ? "text-green-500" : "text-muted-foreground"
                        )}>
                          {isSelected ? '✓' : '○'}
                        </div>
                      </Card>
                    )
                  })}
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="py-4 text-center">
                    <p className="text-muted-foreground">
                      <strong className="text-foreground">{pokemonRegions.length}</strong> region{pokemonRegions.length !== 1 ? 's' : ''} selected
                      {pokemonRegions.length === 0 && ' (Pokemon can exist without any region)'}
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex items-center justify-center min-h-[400px] text-muted-foreground italic">
                <p>Select a Pokemon from the list to assign regions</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default RegionManager
