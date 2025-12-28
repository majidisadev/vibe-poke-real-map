import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import { getAllRegions, getPokemonRegions, getAllPokemon, getAllUserPokemon, setUserPokemonCaught } from '../services/dbService'
import { Region, Pokemon, UserPokemon } from '../db/schema'
import { UN_REGIONS } from '../db/regions'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { ProgressDialog } from '../components/ProgressDialog'
import '../utils/leafletFix'
import 'leaflet/dist/leaflet.css'
import './MapView.css'

function MapView() {
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [pokemonInRegion, setPokemonInRegion] = useState<Pokemon[]>([])
  const [userPokemon, setUserPokemon] = useState<Map<number, UserPokemon>>(new Map())

  useEffect(() => {
    loadRegions()
    loadUserPokemon()
  }, [])

  useEffect(() => {
    if (selectedRegion) {
      loadPokemonInRegion(selectedRegion.id)
    }
  }, [selectedRegion])

  async function loadRegions() {
    try {
      const data = await getAllRegions()
      setRegions(data)
    } catch (error) {
      console.error("Error loading regions:", error)
      // Set empty array on error to prevent further errors
      setRegions([])
    }
  }

  async function loadUserPokemon() {
    try {
      const userData = await getAllUserPokemon()
      const userMap = new Map<number, UserPokemon>()
      userData.forEach(up => userMap.set(up.pokemon_id, up))
      setUserPokemon(userMap)
    } catch (error) {
      console.error("Error loading user pokemon:", error)
      // Set empty map on error to prevent further errors
      setUserPokemon(new Map())
    }
  }

  async function loadPokemonInRegion(regionId: number) {
    try {
      const allPokemon = await getAllPokemon()
      const pokemonInRegionList: Pokemon[] = []

      for (const pokemon of allPokemon) {
        const regionIds = await getPokemonRegions(pokemon.id)
        if (regionIds.includes(regionId)) {
          pokemonInRegionList.push(pokemon)
        }
      }

      // Sort by pokemon number
      pokemonInRegionList.sort((a, b) => a.number - b.number)
      setPokemonInRegion(pokemonInRegionList)
    } catch (error) {
      console.error("Error loading pokemon in region:", error)
      // Set empty array on error
      setPokemonInRegion([])
    }
  }

  async function toggleCaught(pokemonId: number, currentStatus: boolean) {
    try {
      await setUserPokemonCaught(pokemonId, !currentStatus)
      await loadUserPokemon()
    } catch (error) {
      console.error("Error toggling caught status:", error)
    }
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

  const getRegionCenter = (regionCode: string): [number, number] | null => {
    const regionData = UN_REGIONS.find(r => r.code === regionCode)
    return regionData ? regionData.center : null
  }

  const onRegionClick = (region: Region) => {
    setSelectedRegion(region)
  }

  return (
    <div className="map-view flex flex-col gap-4 relative">
      <div className="flex-1 rounded-lg overflow-hidden shadow-lg relative" style={{ minHeight: '400px', height: selectedRegion ? '50%' : '100%' }}>
        <ProgressDialog variant="banner" />
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          maxBounds={[[-90, -180], [90, 180]]}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {regions.map((region) => {
            const center = getRegionCenter(region.code)
            if (!center) return null
            
            return (
              <CircleMarker
                key={region.id}
                center={center}
                radius={8}
                pathOptions={{
                  fillColor: region.color,
                  fillOpacity: 0.7,
                  color: region.color,
                  weight: 2,
                  opacity: 1
                }}
                eventHandlers={{
                  click: () => onRegionClick(region)
                }}
              />
            )
          })}
        </MapContainer>
      </div>

      {selectedRegion && (
        <Card className="w-full" style={{ display: 'flex', flexDirection: 'column' }}>
          <CardHeader className="flex-shrink-0">
            <div className="flex justify-between items-center">
              <CardTitle>{selectedRegion.name} - Pokemon in this Region ({pokemonInRegion.length})</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedRegion(null)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {pokemonInRegion.length === 0 ? (
              <p className="text-muted-foreground italic text-center py-8">
                No Pokemon assigned to this region yet.
              </p>
            ) : (
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">No.</th>
                      <th className="text-left p-3 font-semibold">Image</th>
                      <th className="text-left p-3 font-semibold">Pokemon</th>
                      <th className="text-left p-3 font-semibold">Types</th>
                      <th className="text-left p-3 font-semibold">Habitat</th>
                      <th className="text-left p-3 font-semibold">Caught/Uncaught</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pokemonInRegion.map((pokemon) => {
                      const userData = userPokemon.get(pokemon.id)
                      const isCaught = userData?.caught || false
                      
                      return (
                        <tr key={pokemon.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">#{pokemon.number}</td>
                          <td className="p-3">
                            <img
                              src={pokemon.image_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png`}
                              alt={pokemon.name}
                              className="w-12 h-12 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=Pokemon'
                              }}
                            />
                          </td>
                          <td className="p-3 font-semibold capitalize">{pokemon.name}</td>
                          <td className="p-3">
                            <div className="flex gap-2 flex-wrap">
                              <Badge
                                className="text-white text-xs"
                                style={{ backgroundColor: getTypeColor(pokemon.type1) }}
                              >
                                {pokemon.type1}
                              </Badge>
                              {pokemon.type2 && (
                                <Badge
                                  className="text-white text-xs"
                                  style={{ backgroundColor: getTypeColor(pokemon.type2) }}
                                >
                                  {pokemon.type2}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {pokemon.habitat ? (
                              <span className="capitalize">{pokemon.habitat}</span>
                            ) : (
                              <span className="text-muted-foreground italic">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isCaught}
                              onChange={() => toggleCaught(pokemon.id, isCaught)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MapView
