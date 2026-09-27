import { useState, useEffect, useRef } from 'react'
import { USERS } from '../lib/user'

const COLORS = {
  user1:    'bg-blue-600',
  user2:    'bg-emerald-600',
  narrator: 'bg-purple-600',
}

const TEXT_COLORS = {
  user1:    'text-blue-400',
  user2:    'text-emerald-400',
  narrator: 'text-purple-400',
}

export default function UserSelector({ current, onChange }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const currentUser = USERS.find((u) => u.id === current) || USERS[0]

  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${COLORS[current]} text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 hover:opacity-90 transition`}
        title="Играю за"
      >
        <span className="truncate max-w-[80px] sm:max-w-none">{currentUser.label}</span>
        <span className="text-[10px] opacity-80">▾</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl min-w-[160px] z-30 overflow-hidden">
          {USERS.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onChange(u.id)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition ${
                current === u.id ? 'bg-slate-700' : 'hover:bg-slate-700/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${COLORS[u.id]}`} />
              <span className={TEXT_COLORS[u.id]}>{u.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}