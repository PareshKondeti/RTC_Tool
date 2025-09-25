'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = { id: number; message: string }

const ToastCtx = createContext<{ addToast: (message: string) => void } | null>(null)

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((prev) => [...prev, { id, message }])
    // Auto-dismiss after 3s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  // Also expose on window for quick calls if needed
  if (typeof window !== 'undefined') {
    ;(window as any).toast = addToast
  }

  const value = useMemo(() => ({ addToast }), [addToast])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto rounded-md bg-dark-300 px-4 py-3 text-sm text-white shadow-lg ring-1 ring-black/10">
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}


