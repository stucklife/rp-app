import { useSyncExternalStore } from 'react'
import { subscribe, getSnapshot, removeToast } from '../lib/toastStore'
import Toast from './Toast'

export default function ToastContainer() {
  const toasts = useSyncExternalStore(subscribe, getSnapshot)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed z-[100] pointer-events-none flex flex-col gap-2
                 top-2 left-1/2 -translate-x-1/2 w-[calc(100vw-1rem)] items-center
                 sm:left-auto sm:translate-x-0 sm:right-4 sm:items-end sm:w-auto sm:top-4"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={removeToast} />
      ))}
    </div>
  )
}