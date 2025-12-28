import { Routes, Route, Link, useLocation } from 'react-router-dom'
import MapView from './pages/MapView'
import PokemonList from './pages/PokemonList'
import PokemonDetail from './pages/PokemonDetail'
import RegionManager from './pages/RegionManager'
import { Button } from './components/ui/button'
import { cn } from './lib/utils'
import { ToastProvider, useToastContext } from './contexts/ToastContext'
import { ProgressProvider, useProgressContext } from './contexts/ProgressContext'
import { exportDatabase, importDatabase, ExportData, initDB } from './services/dbService'
import { setProgressCallback } from './services/dbService'
import { useEffect } from 'react'
import { Map as MapIcon, Grid3x3, Globe, Download, Upload } from 'lucide-react'

function NavigationContent() {
  const location = useLocation()
  const { showSuccess, showError } = useToastContext()

  const handleExport = async () => {
    try {
      const data = await exportDatabase()
      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `poke-real-map-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      showSuccess('Database exported successfully!')
    } catch (error) {
      console.error('Export error:', error)
      showError('Failed to export database: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleImport = async () => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        try {
          const text = await file.text()
          const data: ExportData = JSON.parse(text)
          
          // Validate data structure
          if (!data.user_pokemon || !data.pokemon_regions) {
            showError('Invalid file format')
            return
          }

          await importDatabase(data)
          showSuccess('Database imported successfully! Page will refresh.')
          
          // Refresh page after a short delay
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        } catch (error) {
          console.error('Import error:', error)
          showError('Failed to import database: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
      }
      input.click()
    } catch (error) {
      console.error('Import error:', error)
      showError('Failed to import database: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  return (
    <nav className="border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">
            🗺️ Poke Real Map
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              <Button
                variant={location.pathname === '/' ? 'secondary' : 'ghost'}
                asChild
                className={cn(
                  location.pathname === '/' && 'bg-background text-foreground hover:bg-background/90'
                )}
              >
                <Link to="/" className="flex items-center gap-2">
                  <MapIcon className="h-4 w-4" />
                  Map
                </Link>
              </Button>
              <Button
                variant={location.pathname === '/pokemon' ? 'secondary' : 'ghost'}
                asChild
                className={cn(
                  location.pathname === '/pokemon' && 'bg-background text-foreground hover:bg-background/90'
                )}
              >
                <Link to="/pokemon" className="flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  Pokemon
                </Link>
              </Button>
              <Button
                variant={location.pathname === '/regions' ? 'secondary' : 'ghost'}
                asChild
                className={cn(
                  location.pathname === '/regions' && 'bg-background text-foreground hover:bg-background/90'
                )}
              >
                <Link to="/regions" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Regions
                </Link>
              </Button>
            </div>
            <div className="h-6 w-px bg-primary-foreground/30 mx-2" />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleExport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button
                variant="ghost"
                onClick={handleImport}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

function AppContent() {
  const { startProgress, updateProgress, completeProgress } = useProgressContext()

  useEffect(() => {
    // Set up progress callback for dbService
    setProgressCallback((current: number, total: number, message?: string) => {
      if (current === 0 && total > 0) {
        startProgress(total, message || 'Loading data...')
      } else if (current === total && total > 0) {
        updateProgress(current, message || 'Done!')
        setTimeout(() => {
          completeProgress()
        }, 1000)
      } else {
        updateProgress(current, message)
      }
    })

    // Initialize database after progress callback is set
    initDB().catch((error) => {
      console.error('Error initializing database:', error)
    })

    return () => {
      setProgressCallback(null)
    }
  }, [startProgress, updateProgress, completeProgress])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavigationContent />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/pokemon" element={<PokemonList />} />
          <Route path="/pokemon/:id" element={<PokemonDetail />} />
          <Route path="/regions" element={<RegionManager />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <ProgressProvider>
        <AppContent />
      </ProgressProvider>
    </ToastProvider>
  )
}

export default App
