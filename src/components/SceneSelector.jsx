import { useState, useEffect, useRef } from 'react'

export default function SceneSelector({ scenes, active, onSelect, onNew }) {
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

  // Группируем: активные сверху, архивные внизу свёрнуто
  const activeScenes = scenes.filter((s) => s.status === 'active')
  const archivedScenes = scenes.filter((s) => s.status !== 'active')

  const label = active ? active.title : '— нет сцены —'

  return (
    <div ref={wrapRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs sm:text-sm text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-slate-800 flex items-center gap-1 max-w-[180px] sm:max-w-[280px] min-w-0"
        title="Активная сцена"
      >
        <span className="flex-shrink-0">📖</span>
        <span className="truncate">{label}</span>
        <span className="text-[10px] flex-shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl min-w-[260px] max-w-[360px] max-h-80 overflow-y-auto z-30">
          {activeScenes.length === 0 && archivedScenes.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">Сцен нет</div>
          )}

          {activeScenes.map((s) => (
            <SceneOption
              key={s.id}
              scene={s}
              selected={active?.id === s.id}
              onSelect={() => {
                onSelect(s.id)
                setOpen(false)
              }}
            />
          ))}

          {archivedScenes.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] text-slate-500 uppercase tracking-wide border-t border-slate-700">
                Архив
              </div>
              {archivedScenes.map((s) => (
                <SceneOption
                  key={s.id}
                  scene={s}
                  selected={active?.id === s.id}
                  archived
                  onSelect={() => {
                    onSelect(s.id)
                    setOpen(false)
                  }}
                />
              ))}
            </>
          )}

          <div className="border-t border-slate-700">
            <button
              type="button"
              onClick={() => {
                onNew()
                setOpen(false)
              }}
              className="block w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-slate-700"
            >
              + Новая сцена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SceneOption({ scene, selected, archived, onSelect }) {
  const locationName = scene.locations?.name

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full text-left px-3 py-2 text-sm hover:bg-slate-700 ${
        selected ? 'text-white bg-slate-700/50' : 'text-slate-300'
      } ${archived ? 'opacity-60' : ''}`}
    >
      <div className="truncate font-medium">{scene.title}</div>
      {locationName && (
        <div className="text-[10px] text-slate-500 truncate">
          📍 {locationName}
        </div>
      )}
    </button>
  )
}