import { useProgressContext } from '../contexts/ProgressContext'
import { cn } from '../lib/utils'

interface ProgressDialogProps {
  variant?: 'modal' | 'banner'
}

export function ProgressDialog({ variant = 'modal' }: ProgressDialogProps) {
  const { progress } = useProgressContext()

  if (!progress.isActive) {
    return null
  }

  const percentage = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0

  // Banner variant for displaying above map
  if (variant === 'banner') {
    return (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-2xl px-4">
        <div className="bg-background border rounded-lg shadow-lg p-4 backdrop-blur-sm bg-background/95">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {progress.message || 'Loading data...'}
              </h3>
              <span className="text-xs text-muted-foreground">
                {progress.current} / {progress.total} ({percentage}%)
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className={cn(
                  "h-full bg-primary transition-all duration-300 ease-out"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Modal variant (default)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {progress.message || 'Loading data...'}
            </h3>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>
                {progress.current} / {progress.total}
              </span>
              <span>{percentage}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className={cn(
                  "h-full bg-primary transition-all duration-300 ease-out",
                  "flex items-center justify-center"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Please wait, fetching data from API...
          </div>
        </div>
      </div>
    </div>
  )
}

