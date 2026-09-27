import { useEffect } from 'react'

export default function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 h-dvh w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl">
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
          <h2 className="font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-slate-800"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </>
  )
}