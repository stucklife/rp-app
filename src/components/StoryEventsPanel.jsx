import { useState, useMemo } from 'react'
import StoryEventForm from './StoryEventForm'
import { xToDate } from '../lib/dates'

const SORT_OPTIONS = [
  { value: 'time', label: 'Внутриигровая дата' },
  { value: 'created', label: 'Дата создания' },
  { value: 'updated', label: 'Последнее изменение' },
]

export default function StoryEventsPanel({ api, allScenes, locations, onEventCreated }) {
  const {
    events = [],
    links = [],
    create,
    update,
    remove,
    linkEvents,
    unlinkEvents,
    linkScene,
    unlinkScene,
  } = api || {}

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | global | local
  const [sort, setSort] = useState('time')
  const [locationFilter, setLocationFilter] = useState('')
  const [editing, setEditing] = useState(null)

  const safeScenes = Array.isArray(allScenes) ? allScenes : []
  const safeLocations = Array.isArray(locations) ? locations : []

  // Map: scene_id → location_id. Нужен, чтобы быстро фильтровать события по локации сцен.
  const sceneLocationMap = useMemo(() => {
    const m = new Map()
    for (const s of safeScenes) {
      m.set(s.id, s.location_id || null)
    }
    return m
  }, [safeScenes])

  const sorted = useMemo(() => {
    const list = (events || []).filter((e) => {
      if (filter === 'global' && !e.is_global) return false
      if (filter === 'local' && e.is_global) return false
      if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false

      if (locationFilter) {
        // Событие проходит, если хотя бы одна его сцена — в выбранной локации
        const scenesOfEvent = e.scene_event_links?.map((sel) => sel.scene).filter(Boolean) || []
        const match = scenesOfEvent.some((s) => sceneLocationMap.get(s.id) === locationFilter)
        if (!match) return false
      }

      return true
    })

    list.sort((a, b) => {
      if (sort === 'time') {
        const ax = a.game_time?.start_x ?? 0
        const bx = b.game_time?.start_x ?? 0
        if (Number(ax) !== Number(bx)) return Number(ax) - Number(bx)
        return new Date(b.updated_at) - new Date(a.updated_at)
      }
      if (sort === 'created') return new Date(b.created_at) - new Date(a.created_at)
      if (sort === 'updated') return new Date(b.updated_at) - new Date(a.updated_at)
      return 0
    })

    return list
  }, [events, filter, search, sort, locationFilter, sceneLocationMap])

  function openNew() {
    setEditing({ mode: 'new' })
  }

  function openEdit(event) {
    setEditing({ mode: 'edit', event })
  }

  async function handleSave(payload) {
    if (editing.mode === 'new') {
      const { data, error } = await create(payload)
      if (error) {
        alert('Ошибка: ' + error.message)
        return
      }
      onEventCreated?.()
      setEditing({ mode: 'edit', event: data })
      return
    } else {
      const { error } = await update(editing.event.id, payload)
      if (error) {
        alert('Ошибка: ' + error.message)
        return
      }
      setEditing(null)
    }
  }

  async function handleDelete() {
    if (!confirm('Удалить событие? Связи со сценами и другими событиями тоже удалятся.')) return
    await remove(editing.event.id)
    setEditing(null)
  }

  if (editing) {
    const currentEvent = editing.mode === 'edit'
      ? events.find((e) => e.id === editing.event.id) || editing.event
      : editing.event

    return (
      <StoryEventForm
        event={editing.mode === 'edit' ? currentEvent : null}
        allEvents={events}
        allScenes={safeScenes}
        links={links}
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
            placeholder="Поиск событий..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-slate-600"
          />
          <button
            onClick={openNew}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm"
          >
            + Новое
          </button>
        </div>

        <div className="flex gap-1 text-xs">
          {[
            { v: 'all', l: 'Все' },
            { v: 'global', l: '🌍 Глобальные' },
            { v: 'local', l: 'Локальные' },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`px-2 py-1 rounded ${
                filter === f.v ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs"
        >
          <option value="">Все локации</option>
          {safeLocations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>Сортировка: {o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <div className="p-4 text-slate-500 text-sm text-center">
            {search || filter !== 'all' ? 'Ничего не найдено' : 'Событий пока нет'}
          </div>
        )}
        {sorted.map((e) => {
          const scenes = e.scene_event_links?.map((sel) => sel.scene).filter(Boolean) || []
          const dateLabel = e.game_time ? formatTimeRange(e.game_time) : '—'
          return (
            <button
              key={e.id}
              onClick={() => openEdit(e)}
              className="w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 transition block"
            >
              <div className="flex items-start gap-2">
                {e.is_global && <span className="text-yellow-400 flex-shrink-0">🌍</span>}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">📌 {e.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                    {dateLabel}
                  </div>
                  {scenes.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {scenes.map((s) => (
                        <div key={s.id} className="text-xs text-slate-400 truncate">
                          📖 {s.title}
                        </div>
                      ))}
                    </div>
                  )}
                  {scenes.length === 0 && (
                    <div className="text-[10px] text-slate-600 italic mt-1">
                      нет связанных сцен
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

import { displayRange } from '../lib/dates'

function formatTimeRange(gt) {
  if (!gt) return '—'

  const hasStart = Boolean(gt.start_date_text)
  const hasEnd = Boolean(gt.end_date_text)

  // Обе даты — интервал
  if (hasStart && hasEnd) {
    const s = gt.start_bc ? `${gt.start_date_text} BC` : gt.start_date_text
    const e = gt.end_bc ? `${gt.end_date_text} BC` : gt.end_date_text
    return s === e ? s : `${s} — ${e}`
  }

  // Только start — одна дата
  if (hasStart) {
    return gt.start_bc ? `${gt.start_date_text} BC` : gt.start_date_text
  }

  // Ничего — "приблизительно" из координат
  const { text, bc } = xToDate(gt.start_x)
  if (!text) return '—'
  return `≈ ${bc ? text + ' BC' : text}`
}