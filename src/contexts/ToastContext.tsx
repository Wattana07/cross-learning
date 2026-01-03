import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { ToastContainer, type Toast, type ToastType } from '@/components/ui/Toast'

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 5000) => {
      const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
      const newToast: Toast = {
        id,
        message,
        type,
        duration,
      }

      setToasts((prev) => [...prev, newToast])
    },
    []
  )

  const toast = useCallback(
    (message: string, type?: ToastType, duration?: number) => {
      addToast(message, type, duration)
    },
    [addToast]
  )

  const success = useCallback(
    (message: string, duration?: number) => {
      addToast(message, 'success', duration)
    },
    [addToast]
  )

  const error = useCallback(
    (message: string, duration?: number) => {
      addToast(message, 'error', duration)
    },
    [addToast]
  )

  const info = useCallback(
    (message: string, duration?: number) => {
      addToast(message, 'info', duration)
    },
    [addToast]
  )

  const warning = useCallback(
    (message: string, duration?: number) => {
      addToast(message, 'warning', duration)
    },
    [addToast]
  )

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

