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

  // На мобиле — оверлей поверх всего
  // На десктопе (md+) — часть flex-потока, выезжает слева, сжимает контент
  return (
    <>
      {/* Затемнение только на мобиле */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          bg-slate-900 border-slate-800 flex flex-col shadow-2xl
          fixed top-0 left-0 h-dvh w-full z-50 border-r
          transition-transform duration-200
          md:relative md:h-auto md:z-auto md:flex-shrink-0
          ${open
            ? 'translate-x-0 md:w-[420px]'
            : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'
          }
        `}
      >
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
      </aside>
    </>
  )
}