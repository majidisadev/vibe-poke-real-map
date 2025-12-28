import { createContext, useContext, useState, ReactNode } from 'react'
import { Toast, ToastContainer } from '../components/ui/toast'

interface ToastContextType {
  showError: (message: string) => void
  showSuccess: (message: string) => void
  showInfo: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let toastIdCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
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

  const showError = (message: string) => addToast(message, 'error')
  const showSuccess = (message: string) => addToast(message, 'success')
  const showInfo = (message: string) => addToast(message, 'info')

  return (
    <ToastContext.Provider value={{ showError, showSuccess, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}

