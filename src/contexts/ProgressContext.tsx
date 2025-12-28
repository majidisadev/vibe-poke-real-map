import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface ProgressState {
  isActive: boolean
  current: number
  total: number
  message: string
}

interface ProgressContextType {
  progress: ProgressState
  setProgress: (progress: Partial<ProgressState>) => void
  startProgress: (total: number, message?: string) => void
  updateProgress: (current: number, message?: string) => void
  completeProgress: () => void
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgressState] = useState<ProgressState>({
    isActive: false,
    current: 0,
    total: 0,
    message: '',
  })

  const setProgress = useCallback((updates: Partial<ProgressState>) => {
    setProgressState((prev) => ({ ...prev, ...updates }))
  }, [])

  const startProgress = useCallback((total: number, message: string = 'Memuat data...') => {
    setProgressState({
      isActive: true,
      current: 0,
      total,
      message,
    })
  }, [])

  const updateProgress = useCallback((current: number, message?: string) => {
    setProgressState((prev) => ({
      ...prev,
      current,
      ...(message && { message }),
    }))
  }, [])

  const completeProgress = useCallback(() => {
    setProgressState((prev) => ({
      ...prev,
      isActive: false,
      current: prev.total,
    }))
    // Auto-hide after a short delay
    setTimeout(() => {
      setProgressState({
        isActive: false,
        current: 0,
        total: 0,
        message: '',
      })
    }, 500)
  }, [])

  return (
    <ProgressContext.Provider
      value={{
        progress,
        setProgress,
        startProgress,
        updateProgress,
        completeProgress,
      }}
    >
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgressContext() {
  const context = useContext(ProgressContext)
  if (context === undefined) {
    throw new Error('useProgressContext must be used within a ProgressProvider')
  }
  return context
}

