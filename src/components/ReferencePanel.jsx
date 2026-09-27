import { useState } from 'react'
import Drawer from './Drawer'
import CharactersPanel from './CharactersPanel'

const TABS = [
  { id: 'characters', label: 'Персонажи', icon: '👤' },
  // позже: locations, global_events, game_time
]

export default function ReferencePanel({ open, onClose, charactersApi }) {
  const [tab, setTab] = useState('characters')

  return (
    <Drawer open={open} onClose={onClose} title="📚 Справочники">
      <div className="flex flex-col h-full">
        <div className="flex gap-1 px-3 py-2 border-b border-slate-800 flex-shrink-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                tab === t.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {tab === 'characters' && <CharactersPanel api={charactersApi} />}
        </div>
      </div>
    </Drawer>
  )
}