import { useState } from 'react'
import Drawer from './Drawer'
import CharactersPanel from './CharactersPanel'
import LocationsPanel from './LocationsPanel'

const TABS = [
  { id: 'characters', label: 'Персонажи', icon: '👤' },
  { id: 'locations',  label: 'Локации',   icon: '📍' },
]

export default function ReferencePanel({ open, onClose, charactersApi, locationsApi }) {
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
          {tab === 'locations'  && <LocationsPanel  api={locationsApi}  />}
        </div>
      </div>
    </Drawer>
  )
}