import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllPokemon, getAllUserPokemon, setUserPokemonCaught } from '../services/dbService'
import { Pokemon, UserPokemon } from '../db/schema'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'
import { useToastContext } from '../contexts/ToastContext'
import './PokemonList.css'

function PokemonList() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([])
  const [userPokemon, setUserPokemon] = useState<Map<number, UserPokemon>>(new Map())
  const [filter, setFilter] = useState<'all' | 'caught' | 'uncaught'>('all')
  const [generationFilter, setGenerationFilter] = useState<number | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const toast = useToastContext()

  useEffect(() => {
    loadData()
  }, [])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, generationFilter, searchTerm])

  async function loadData() {
    setLoading(true)
    try {
      const [pokemonList, userData] = await Promise.all([
        getAllPokemon(),
        getAllUserPokemon()
      ])

      setPokemon(pokemonList.sort((a, b) => a.number - b.number))
      
      const userMap = new Map<number, UserPokemon>()
      userData.forEach(up => userMap.set(up.pokemon_id, up))
      setUserPokemon(userMap)
    } catch (error) {
      console.error('Error loading Pokemon data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Pokemon data'
      toast.showError(`Error: ${errorMessage}. Please refresh the page or try again later.`)
    } finally {
      setLoading(false)
    }
  }

  async function toggleCaught(pokemonId: number, currentStatus: boolean) {
    try {
      await setUserPokemonCaught(pokemonId, !currentStatus)
      loadData()
    } catch (error) {
      console.error('Error toggling caught status:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update Pokemon status'
      toast.showError(`Error: ${errorMessage}`)
    }
  }

  const filteredPokemon = pokemon.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.number.toString().includes(searchTerm)
    
    const matchesGeneration = generationFilter === 'all' || p.generation === generationFilter
    
    if (!matchesSearch || !matchesGeneration) return false
    
    if (filter === 'all') return true
    if (filter === 'caught') return userPokemon.get(p.id)?.caught
    if (filter === 'uncaught') return !userPokemon.get(p.id)?.caught
    
    return true
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredPokemon.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPokemon = filteredPokemon.slice(startIndex, endIndex)

  // Get unique generations from pokemon list
  const availableGenerations = Array.from(new Set(pokemon.map(p => p.generation).filter((g): g is number => g !== undefined))).sort((a, b) => a - b)

  const caughtCount = Array.from(userPokemon.values()).filter(up => up.caught).length
  const totalCount = pokemon.length

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-lg text-muted-foreground">Loading Pokemon data...</p>
      </div>
    )
  }

  return (
    <div className="pokemon-list-page">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Pokemon List</h1>
        <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-2 text-base">
          Caught: {caughtCount}/{totalCount}
        </Badge>
      </div>

      <div className="flex gap-4 mb-8 flex-wrap">
        <Input
          type="text"
          placeholder="Search by name or number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[250px]"
        />
        <div className="flex gap-2 flex-wrap">
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
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'caught' ? 'default' : 'outline'}
            onClick={() => setFilter('caught')}
          >
            Caught
          </Button>
          <Button
            variant={filter === 'uncaught' ? 'default' : 'outline'}
            onClick={() => setFilter('uncaught')}
          >
            Uncaught
          </Button>
        </div>
      </div>

      <div className="pokemon-grid">
        {paginatedPokemon.map((p) => {
          const userData = userPokemon.get(p.id)
          const isCaught = userData?.caught || false

          return (
            <Card
              key={p.id}
              className={cn(
                "pokemon-card hover:shadow-lg transition-all cursor-pointer",
                isCaught && "border-green-500 border-2 bg-gradient-to-br from-white to-green-50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-muted-foreground">#{p.number}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-full",
                      isCaught ? "bg-green-500 hover:bg-green-600 text-white" : "border-2"
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      toggleCaught(p.id, isCaught)
                    }}
                    title={isCaught ? 'Mark as uncaught' : 'Mark as caught'}
                  >
                    {isCaught ? '✓' : '○'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Link to={`/pokemon/${p.id}`} className="pokemon-link">
                  <img
                    src={p.image_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.number}.png`}
                    alt={p.name}
                    className="w-[120px] h-[120px] object-contain mx-auto mb-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/120?text=Pokemon'
                    }}
                  />
                  <h3 className="text-xl font-semibold mb-2 capitalize">{p.name}</h3>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <span className={`type type-${p.type1.toLowerCase()}`}>{p.type1}</span>
                    {p.type2 && (
                      <span className={`type type-${p.type2.toLowerCase()}`}>{p.type2}</span>
                    )}
                  </div>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredPokemon.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No Pokemon found matching your search.</p>
        </div>
      )}

      {filteredPokemon.length > 0 && (
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Page {currentPage} of {totalPages} ({filteredPokemon.length} Pokemon)
            </span>
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2 flex-wrap justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Show first page, last page, current page, and pages around current
                  if (page === 1 || page === totalPages) return true
                  if (Math.abs(page - currentPage) <= 1) return true
                  return false
                })
                .map((page, index, array) => {
                  // Add ellipsis if there's a gap
                  const showEllipsisBefore = index > 0 && page - array[index - 1] > 1
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsisBefore && <span className="px-2">...</span>}
                      <Button
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PokemonList
