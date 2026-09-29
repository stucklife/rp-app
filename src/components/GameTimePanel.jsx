import { useMemo } from 'react'
import { displayRange } from '../lib/dates'

export default function GameTimePanel({ api, scenes }) {
  const { times, loading } = api

  const scenesByTime = useMemo(() => {
    const map = {}
    for (const s of scenes || []) {
      if (!s.game_time_id) continue
      if (!map[s.game_time_id]) map[s.game_time_id] = []
      map[s.game_time_id].push(s)
    }
    return map
  }, [scenes])

  const sorted = useMemo(() => {
    return [...times].sort((a, b) => Number(a.start_x) - Number(b.start_x))
  }, [times])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-800 flex-shrink-0">
        <p className="text-xs text-slate-500">
          Справочник времени. Создаётся автоматически при работе со сценами.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="p-4 text-slate-500 text-sm">Загрузка...</div>}
        {!loading && sorted.length === 0 && (
          <div className="p-4 text-slate-500 text-sm text-center">
            Времени пока нет. Создай сцену — время появится автоматически.
          </div>
        )}
        {sorted.map((t) => {
          const linked = scenesByTime[t.id] || []
          return (
            <div key={t.id} className="px-4 py-3 border-b border-slate-800">
              <div className="font-medium">
                {displayRange(t.start_x, t.end_x, t.start_date_text, t.start_bc, t.end_date_text, t.end_bc)}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                x: {t.start_x} — {t.end_x}
              </div>
              {linked.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {linked.map((s) => (
                    <div key={s.id} className="text-xs text-slate-400 truncate">
                      📖 {s.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}