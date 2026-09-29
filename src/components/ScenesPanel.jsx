import { useMemo, useState } from 'react'
import SceneForm from './SceneForm'

export default function ScenesPanel({ api, locations, gameTime, cursorX, activeId, onSelect, onGameTimeChanged }) {
  const { scenes, create, update, remove } = api
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState(null)

  const visible = useMemo(() => {
    return scenes.filter((s) => {
      if (!showArchived && s.status !== 'active') return false
      if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [scenes, search, showArchived])

  function openNew() {
    setEditing({ mode: 'new' })
  }

  function openEdit(scene) {
    setEditing({ mode: 'edit', scene })
  }

  async function handleSave(payload) {
    if (editing.mode === 'new') {
      const { data, error } = await create(payload)
      if (error) {
        alert('Ошибка: ' + error.message)
        return
      }
      if (data?.id) onSelect(data.id)
      onGameTimeChanged?.()
    } else {
      const { data, error } = await update(editing.scene.id, payload)
      if (error) {
        alert('Ошибка: ' + error.message)
        return
      }
      onGameTimeChanged?.()
    }
    setEditing(null)
  }

  async function handleDelete() {
    if (!editing?.scene?.id) return
    if (!confirm('Удалить сцену? Сообщения останутся в истории.')) return
    await remove(editing.scene.id)
    setEditing(null)
  }

  if (editing) {
    return (
      <SceneForm
        scene={editing.mode === 'edit' ? editing.scene : null}
        locations={locations}
        gameTime={gameTime}
        cursorX={cursorX}
        onSave={handleSave}
        onDelete={editing.mode === 'edit' ? handleDelete : null}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-800 space-y-2 flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск сцен..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-slate-600"
          />
          <button
            onClick={openNew}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm"
          >
            + Новая
          </button>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-400">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="w-3.5 h-3.5 accent-blue-600"
          />
          Показывать архив
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 && (
          <div className="p-4 text-slate-500 text-sm text-center">
            {search ? 'Ничего не найдено' : 'Сцен пока нет'}
          </div>
        )}
        {visible.map((s) => {
          const isActive = s.id === activeId
          const locationName = s.locations?.name
          return (
            <div
              key={s.id}
              className={`border-b border-slate-800 group ${
                isActive ? 'bg-slate-800/40' : ''
              }`}
            >
              <div className="flex items-stretch">
                <button
                  onClick={() => onSelect(s.id)}
                  className="flex-1 text-left px-4 py-2.5 hover:bg-slate-800/50 transition min-w-0"
                >
                  <div className="flex items-center gap-2">
                    {isActive && <span className="text-blue-400 text-xs">●</span>}
                    <span className="font-medium truncate">{s.title}</span>
                    {s.status === 'archived' && (
                      <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                        архив
                      </span>
                    )}
                  </div>
                  {locationName && (
                    <div className="text-slate-500 text-[10px] mt-0.5 truncate">
                      📍 {locationName}
                      {s.time_label && ` · ${s.time_label}`}
                    </div>
                  )}
                  {s.description && (
                    <div className="text-slate-400 text-xs mt-0.5 line-clamp-2">
                      {s.description}
                    </div>
                  )}
                </button>
                <button
                  onClick={() => openEdit(s)}
                  className="px-3 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Редактировать"
                >
                  ✎
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}