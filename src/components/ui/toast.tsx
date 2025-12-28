import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'

export interface Toast {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
  duration?: number
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

function ToastItem({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id)
      }, toast.duration || 5000)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onClose])

  return (
    <div
      className={cn(
        "min-w-[300px] max-w-[500px] p-4 rounded-lg shadow-lg border",
        "animate-in slide-in-from-top-5 fade-in-0",
        toast.type === 'error' && "bg-red-50 border-red-200 text-red-900",
        toast.type === 'success' && "bg-green-50 border-green-200 text-green-900",
        toast.type === 'info' && "bg-blue-50 border-blue-200 text-blue-900"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold mb-1">
            {toast.type === 'error' && 'Error'}
            {toast.type === 'success' && 'Success'}
            {toast.type === 'info' && 'Info'}
          </p>
          <p className="text-sm">{toast.message}</p>
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className={cn(
            "text-lg font-bold hover:opacity-70 transition-opacity",
            toast.type === 'error' && "text-red-600",
            toast.type === 'success' && "text-green-600",
            toast.type === 'info' && "text-blue-600"
          )}
        >
          ×
        </button>
      </div>
    </div>
  )
}

export function ToastContainer({ toasts, onClose }: { toasts: Toast[], onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}

let toastIdCounter = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, type: 'error' | 'success' | 'info' = 'info', duration?: number) => {
    const id = `toast-${++toastIdCounter}`
    const newToast: Toast = { id, message, type, duration }
    setToasts((prev) => [...prev, newToast])
    return id
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return {
    toasts,
    addToast,
    removeToast,
    showError: (message: string) => addToast(message, 'error'),
    showSuccess: (message: string) => addToast(message, 'success'),
    showInfo: (message: string) => addToast(message, 'info'),
  }
}

