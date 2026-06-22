import { useState, useCallback } from 'react'

const TOAST_DURATION = 4000

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_DURATION)
  }, [])

  const success = useCallback((msg) => addToast(msg, 'success'), [addToast])
  const error = useCallback((msg) => addToast(msg, 'error'), [addToast])
  const info = useCallback((msg) => addToast(msg, 'info'), [addToast])

  return { toasts, success, error, info }
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null

  const styles = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-indigo-600',
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${styles[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm animate-slide-in max-w-sm`}
          role="alert"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
