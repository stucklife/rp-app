import { useState, useEffect, useRef } from 'react'

export default function CharacterPicker({ characters, value, onChange, placeholder = '— от себя —', compact = false }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const current = characters.find((c) => c.id === value)
  const label = current ? current.name : placeholder

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? 'text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 flex items-center gap-1 max-w-full'
            : 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-left flex items-center justify-between hover:border-slate-600'
        }
      >
        <span className="truncate">{compact ? `🎭 ${label}` : label}</span>
        <span className="text-[10px] opacity-60 ml-1">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 bottom-full mb-1 left-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl min-w-[180px] max-h-64 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
            className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-700 ${
              !value ? 'text-white bg-slate-700/50' : 'text-slate-400'
            }`}
          >
            {placeholder}
          </button>

          {characters.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.id)
                setOpen(false)
              }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-700 ${
                value === c.id ? 'text-white bg-slate-700/50' : 'text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {c.is_important && <span className="text-yellow-400 text-xs">★</span>}
                <span className="truncate">{c.name}</span>
                {c.is_player && (
                  <span className="text-[10px] text-slate-500 ml-auto">{c.owner}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}