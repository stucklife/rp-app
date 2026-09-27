import { useState, useEffect, useRef } from 'react'

export default function CharacterSelector({
  currentUser,
  characters,
  value,
  onChange,
  onCreate,
}) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const wrapRef = useRef(null)

  // Закрыть по клику вне
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

  // Фильтр по роли пользователя
  const visible = characters.filter((c) => {
    if (currentUser === 'narrator') return true
    if (c.is_player && c.owner === currentUser) return true
    if (!c.is_player) return true // NPC видны всем
    return false
  })

  const current = characters.find((c) => c.id === value)
  const label = current ? current.name : `— как ${currentUser === 'narrator' ? 'Narrator' : currentUser.replace('user', 'User ')} —`

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    const { data, error } = await onCreate({
      name,
      is_player: currentUser !== 'narrator',
      owner: currentUser !== 'narrator' ? currentUser : null,
    })
    if (error) {
      alert('Ошибка: ' + error.message)
      return
    }
    onChange(data.id)
    setCreating(false)
    setNewName('')
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 flex items-center gap-1"
      >
        <span>🎭</span>
        <span className="truncate max-w-[180px]">{label}</span>
        <span className="text-[10px]">▾</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl min-w-[220px] max-h-64 overflow-y-auto z-20">
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
            className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-700 ${
              !value ? 'text-white' : 'text-slate-400'
            }`}
          >
            — от себя —
          </button>

          {visible.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.id)
                setOpen(false)
              }}
              className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-700 ${
                value === c.id ? 'text-white' : 'text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {c.is_important && <span className="text-yellow-400 text-xs">★</span>}
                <span>{c.name}</span>
                {c.is_player && (
                  <span className="text-[10px] text-slate-500 ml-auto">
                    {c.owner}
                  </span>
                )}
              </div>
            </button>
          ))}

          <div className="border-t border-slate-700">
            {!creating ? (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="block w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-slate-700"
              >
                + Создать персонажа
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
                  placeholder="Имя..."
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