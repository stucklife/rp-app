import { useState, useEffect, useRef } from 'react'

export default function UniverseSelector({ universes, current, onSelect, onCreate }) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setCreating(false)
        setNewName('')
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    const { data, error } = await onCreate({ name })
    if (error) {
      alert('Ошибка: ' + error.message)
      return
    }
    onSelect(data.id)
    setCreating(false)
    setNewName('')
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs sm:text-sm text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-slate-800 flex items-center gap-1 max-w-[160px] sm:max-w-[240px]"
        title="Универсум"
      >
        <span>🌌</span>
        <span className="truncate">{current?.name || '— нет —'}</span>
        <span className="text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl min-w-[220px] max-h-64 overflow-y-auto z-30">
          {universes.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onSelect(u.id)
                setOpen(false)
              }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-700 ${
                current?.id === u.id ? 'text-white bg-slate-700/50' : 'text-slate-300'
              }`}
            >
              {u.name}
            </button>
          ))}

          <div className="border-t border-slate-700">
            {!creating ? (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="block w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-slate-700"
              >
                + Новый универсум
              </button>
            ) : (
              <div className="p-2 flex gap-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') {
                      setCreating(false)
                      setNewName('')
                    }
                  }}
                  placeholder="Название мира..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-slate-600"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-2 rounded text-sm"
                >
                  ✓
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}