import { useState } from 'react'
import Drawer from './Drawer'
import CharactersPanel from './CharactersPanel'
import LocationsPanel from './LocationsPanel'
import ScenesPanel from './ScenesPanel'
import NotificationSettings from './NotificationSettings'

const REFERENCE_TABS = [
  { id: 'characters', label: 'Персонажи', icon: '👤' },
  { id: 'locations',  label: 'Локации',   icon: '📍' },
]

export default function ReferencePanel({
  open,
  onClose,
  charactersApi,
  locationsApi,
  scenesApi,
  activeSceneId,
  onSelectScene,
  notificationsApi,
}) {
  const [section, setSection] = useState('scenes') // scenes | references
  const [tab, setTab] = useState('characters')

  return (
    <Drawer open={open} onClose={onClose} title="📚 Пространство">
      <div className="flex flex-col h-full">
        {/* Верхний переключатель: Сцены / Справочники */}
        <div className="flex border-b border-slate-800 flex-shrink-0">
          <button
            onClick={() => setSection('scenes')}
            className={`flex-1 px-3 py-2.5 text-sm font-medium transition ${
              section === 'scenes'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📖 Сцены
          </button>
          <button
            onClick={() => setSection('references')}
            className={`flex-1 px-3 py-2.5 text-sm font-medium transition ${
              section === 'references'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📚 Справочники
          </button>
        </div>

        {/* Содержимое */}
        {section === 'scenes' && (
          <div className="flex-1 overflow-hidden">
            <ScenesPanel
              api={scenesApi}
              locations={locationsApi.locations}
              activeId={activeSceneId}
              onSelect={onSelectScene}
            />
          </div>
        )}

                {section === 'references' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex gap-1 px-3 py-2 border-b border-slate-800 flex-shrink-0 overflow-x-auto">
              {REFERENCE_TABS.map((t) => (
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
        )}

        <NotificationSettings
          settings={notificationsApi.settings}
          update={notificationsApi.update}
          toggleType={notificationsApi.toggleType}
          toggleSource={notificationsApi.toggleSource}
        />
      </div>
    </Drawer>
  )
}