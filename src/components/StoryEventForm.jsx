import { useEffect, useState } from 'react'
import { dateToX } from '../lib/dates'
import DatePicker from './DatePicker'

export default function StoryEventForm({
  event,
  allEvents,
  allScenes,
  links,
  onSave,
  onDelete,
  onCancel,
}) {
  const currentTime = event?.game_time

  // Вспомогательные: получить из links текущие ID для каждой категории
  const computeInitialParents = () => {
    const safe = Array.isArray(links) ? links : []
    return safe
      .filter((l) => l.relation === 'parent_of' && l.to_event_id === event?.id)
      .map((l) => l.from_event_id)
  }
  const computeInitialChildren = () => {
    const safe = Array.isArray(links) ? links : []
    return safe
      .filter((l) => l.relation === 'parent_of' && l.from_event_id === event?.id)
      .map((l) => l.to_event_id)
  }
  const computeInitialFollowsFrom = () => {
    const safe = Array.isArray(links) ? links : []
    return safe
      .filter((l) => l.relation === 'leads_to' && l.to_event_id === event?.id)
      .map((l) => l.from_event_id)
  }
  const computeInitialLeadsTo = () => {
    const safe = Array.isArray(links) ? links : []
    return safe
      .filter((l) => l.relation === 'leads_to' && l.from_event_id === event?.id)
      .map((l) => l.to_event_id)
  }
  const computeInitialSceneIds = () =>
    (event?.scene_event_links || []).map((sel) => sel.scene?.id).filter(Boolean)

  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    is_global: event?.is_global || false,
    useManualDates: Boolean(currentTime),
    start_date_text: currentTime?.start_date_text || '',
    start_bc: currentTime?.start_bc || false,
    end_date_text: currentTime?.end_date_text || '',
    end_bc: currentTime?.end_bc || false,
    parents: computeInitialParents(),
    children: computeInitialChildren(),
    followsFrom: computeInitialFollowsFrom(),
    leadsTo: computeInitialLeadsTo(),
    linkedSceneIds: computeInitialSceneIds(),
  })

  const [openSection, setOpenSection] = useState({
    main: true,
    eventLinks: false,
    sceneLinks: false,
  })

  // Синхронизация при загрузке event или links
  useEffect(() => {
    if (!event?.id) return
    setForm((f) => ({
      ...f,
      title: event.title || '',
      description: event.description || '',
      is_global: event.is_global || false,
      useManualDates: Boolean(currentTime),
      start_date_text: currentTime?.start_date_text || '',
      start_bc: currentTime?.start_bc || false,
      end_date_text: currentTime?.end_date_text || '',
      end_bc: currentTime?.end_bc || false,
      parents: computeInitialParents(),
      children: computeInitialChildren(),
      followsFrom: computeInitialFollowsFrom(),
      leadsTo: computeInitialLeadsTo(),
      linkedSceneIds: computeInitialSceneIds(),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    event?.id,
    currentTime?.id,
    (links || []).length,
  ])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const toggle = (key) => setOpenSection((s) => ({ ...s, [key]: !s[key] }))
  const isEdit = Boolean(event?.id)

  const safeEvents = Array.isArray(allEvents) ? allEvents : []
  const safeScenes = Array.isArray(allScenes) ? allScenes : []

  function computeCoords() {
    if (!form.useManualDates) return { start_x: null, end_x: null }
    let startX = null, endX = null
    if (form.start_date_text) startX = dateToX(form.start_date_text, form.start_bc)
    if (form.end_date_text) endX = dateToX(form.end_date_text, form.end_bc)
    if (startX != null && endX == null) endX = startX
    if (endX != null && startX == null) startX = endX
    return { start_x: startX, end_x: endX }
  }

  async function handleSave() {
    if (!form.title.trim()) return
    const coords = computeCoords()

    let startText = null, startBc = false, endText = null, endBc = false
    if (form.useManualDates) {
      startText = form.start_date_text || null
      startBc = form.start_bc || false
      if (form.end_date_text) {
        endText = form.end_date_text
        endBc = form.end_bc || false
      } else if (startText) {
        endText = startText
        endBc = startBc
      }
    }

    // Собираем нормализованные связи {from, to, relation}
    const storyEventIds = [
      ...form.parents.map((parentId) => ({
        from_event_id: parentId, to_event_id: event.id, relation: 'parent_of',
      })),
      ...form.children.map((childId) => ({
        from_event_id: event.id, to_event_id: childId, relation: 'parent_of',
      })),
      ...form.followsFrom.map((otherId) => ({
        from_event_id: otherId, to_event_id: event.id, relation: 'leads_to',
      })),
      ...form.leadsTo.map((otherId) => ({
        from_event_id: event.id, to_event_id: otherId, relation: 'leads_to',
      })),
    ]

    await onSave({
      title: form.title.trim(),
      description: form.description.trim() || null,
      is_global: form.is_global,
      start_x: coords.start_x,
      end_x: coords.end_x,
      start_date_text: startText,
      start_bc: startBc,
      end_date_text: endText,
      end_bc: endBc,
      storyEventIds,
      sceneIds: form.linkedSceneIds,
    })
  }

  function getEventTitle(id) {
    return safeEvents.find((e) => e.id === id)?.title || '???'
  }

  // Транзитивное замыкание по parent_of:
  // все события, которые выше текущего (его родители и родители родителей)
  // и все, которые ниже (его дети и дети детей).
  function computeParentClosure(currentId, links, direction) {
    // direction = 'up'   — идём к родителям (from у связей, где to = current)
    // direction = 'down' — идём к детям   (to у связей, где from = current)
    const visited = new Set()
    const stack = [currentId]
    const result = new Set()

    while (stack.length > 0) {
      const cur = stack.pop()
      if (visited.has(cur)) continue
      visited.add(cur)

      for (const l of links || []) {
        if (l.relation !== 'parent_of') continue
        if (direction === 'up' && l.to_event_id === cur) {
          result.add(l.from_event_id)
          stack.push(l.from_event_id)
        }
        if (direction === 'down' && l.from_event_id === cur) {
          result.add(l.to_event_id)
          stack.push(l.to_event_id)
        }
      }
    }
    // Убираем самого текущего, если попал
    result.delete(currentId)
    return result
  }

  const ancestorsExclude = isEdit
    ? computeParentClosure(event.id, links, 'up')
    : new Set()
  const descendantsExclude = isEdit
    ? computeParentClosure(event.id, links, 'down')
    : new Set()

  // Объединяем с уже выбранными в форме
  const parentsExclude = [
    ...(form.children || []),
    ...descendantsExclude,
  ]
  const childrenExclude = [
    ...(form.parents || []),
    ...ancestorsExclude,
  ]

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={onCancel} className="text-slate-400 hover:text-white text-sm">
          ← Назад
        </button>
        <span className="text-slate-500 text-sm">
          {isEdit ? 'Редактирование события' : 'Новое событие'}
        </span>
      </div>

      <Section title="Основное" open={openSection.main} onToggle={() => toggle('main')}>
        <Field label="Название">
          <input
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
            autoFocus
          />
        </Field>

        <Field label="Описание">
          <textarea
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            rows={4}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-slate-600"
          />
        </Field>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_global}
            onChange={(e) => set({ is_global: e.target.checked })}
            className="w-4 h-4 accent-yellow-500"
          />
          <span className="text-sm text-slate-300">🌍 Глобальное событие</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.useManualDates}
            onChange={(e) => set({ useManualDates: e.target.checked })}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm text-slate-300">Указать дату вручную</span>
        </label>

        {form.useManualDates && (
          <>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Начало</label>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <DatePicker
                    value={form.start_date_text}
                    bc={form.start_bc}
                    cursorX={null}
                    onChange={({ text, bc }) => set({
                      start_date_text: maskDate(text),
                      start_bc: bc,
                    })}
                  />
                </div>
                <label className="flex items-center gap-1 pt-2">
                  <input
                    type="checkbox"
                    checked={form.start_bc}
                    onChange={(e) => set({ start_bc: e.target.checked })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xs text-slate-400">до н. э.</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Окончание</label>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <DatePicker
                    value={form.end_date_text}
                    bc={form.end_bc}
                    cursorX={null}
                    onChange={({ text, bc }) => set({
                      end_date_text: maskDate(text),
                      end_bc: bc,
                    })}
                  />
                </div>
                <label className="flex items-center gap-1 pt-2">
                  <input
                    type="checkbox"
                    checked={form.end_bc}
                    onChange={(e) => set({ end_bc: e.target.checked })}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xs text-slate-400">до н. э.</span>
                </label>
              </div>
            </div>
          </>
        )}

        {event?.game_time && (
          <div className="text-xs text-slate-500 bg-slate-800/50 border border-slate-700 rounded p-2 font-mono">
            x_start: {event.game_time.start_x} · x_end: {event.game_time.end_x}
          </div>
        )}
      </Section>

      {isEdit && (
        <Section title="Связи с событиями" open={openSection.eventLinks} onToggle={() => toggle('eventLinks')}>
          <LinkBlock
            title="Родители (это событие подчинено)"
            value={form.parents}
            onChange={(v) => set({ parents: v })}
            excludeIds={parentsExclude}
            allEvents={safeEvents}
            currentId={event.id}
            getTitle={getEventTitle}
            placeholder="Выбрать родителя..."
          />
          <LinkBlock
            title="Дети (подчинены этому событию)"
            value={form.children}
            onChange={(v) => set({ children: v })}
            excludeIds={childrenExclude}
            allEvents={safeEvents}
            currentId={event.id}
            getTitle={getEventTitle}
            placeholder="Выбрать ребёнка..."
          />
          <LinkBlock
            title="Следует из"
            value={form.followsFrom}
            onChange={(v) => set({ followsFrom: v })}
            excludeIds={[]}
            allEvents={safeEvents}
            currentId={event.id}
            getTitle={getEventTitle}
            placeholder="Это событие следует из..."
          />
          <LinkBlock
            title="Приводит к"
            value={form.leadsTo}
            onChange={(v) => set({ leadsTo: v })}
            excludeIds={[]}
            allEvents={safeEvents}
            currentId={event.id}
            getTitle={getEventTitle}
            placeholder="Это событие приводит к..."
          />
        </Section>
      )}

      {isEdit && (
        <Section title="Сцены, раскрывающие событие" open={openSection.sceneLinks} onToggle={() => toggle('sceneLinks')}>
          <SceneLinksBlock
            value={form.linkedSceneIds}
            onChange={(v) => set({ linkedSceneIds: v })}
            allScenes={safeScenes}
          />
        </Section>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!form.title.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 rounded-lg text-sm font-medium"
        >
          Сохранить
        </button>
        {isEdit && onDelete && (
          <button
            onClick={onDelete}
            className="bg-red-900/60 hover:bg-red-900 text-red-200 px-4 py-2 rounded-lg text-sm"
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, open, onToggle, children }) {
  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between bg-slate-800/40 hover:bg-slate-800/70 transition text-left"
      >
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <span className="text-slate-500 text-xs">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="p-3 space-y-3 bg-slate-900/40">{children}</div>}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function maskDate(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (!digits) return ''
  let result = digits.slice(0, 2)
  if (digits.length >= 3) result += '.' + digits.slice(2, 4)
  if (digits.length >= 5) result += '.' + digits.slice(4, 8)
  return result
}

function LinkBlock({ title, value, onChange, excludeIds, allEvents, currentId, getTitle, placeholder }) {
  const [openSlots, setOpenSlots] = useState(0)

  const excludeSet = new Set([currentId, ...(excludeIds || []), ...value])
  const available = allEvents.filter((e) => !excludeSet.has(e.id))

  function handleSelect(slotIndex, selectedId) {
    if (!selectedId) return
    onChange([...value, selectedId])
    setOpenSlots((s) => Math.max(0, s - 1))
  }

  function handleRemove(id) {
    onChange(value.filter((x) => x !== id))
  }

  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{title}</label>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 space-y-1">
        {value.length === 0 && openSlots === 0 && (
          <div className="text-xs text-slate-500 italic">Нет связей</div>
        )}

        {/* Заполненные слоты */}
        {value.map((id) => (
          <div key={id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-slate-200">📌 {getTitle(id)}</span>
            <button
              type="button"
              onClick={() => handleRemove(id)}
              className="text-slate-500 hover:text-red-400 text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Пустые слоты */}
        {Array.from({ length: openSlots }).map((_, i) => (
          <div key={`slot-${i}`} className="flex gap-1">
            <select
              value=""
              onChange={(e) => handleSelect(i, e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
            >
              <option value="">{placeholder}</option>
              {available.map((e) => (
                <option key={e.id} value={e.id}>📌 {e.title}</option>
              ))}
            </select>
          </div>
        ))}

        {/* Кнопка + */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setOpenSlots((s) => s + 1)}
            disabled={available.length === 0}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-2 py-1 rounded text-xs"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

function SceneLinksBlock({ value, onChange, allScenes }) {
  const [openSlots, setOpenSlots] = useState(0)
  const scenes = Array.isArray(allScenes) ? allScenes : []
  const valueSet = new Set(value || [])
  const available = scenes.filter((s) => !valueSet.has(s.id))

  function getScene(id) {
    return scenes.find((s) => s.id === id)
  }

  function handleSelect(selectedId) {
    if (!selectedId) return
    onChange([...(value || []), selectedId])
    setOpenSlots((s) => Math.max(0, s - 1))
  }

  function handleRemove(id) {
    onChange((value || []).filter((x) => x !== id))
  }

  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">
        Подчинённые сцены (раскрывают событие)
      </label>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 space-y-1">
        {(value || []).length === 0 && openSlots === 0 && (
          <div className="text-xs text-slate-500 italic">Нет связанных сцен</div>
        )}

        {(value || []).map((id) => {
          const s = getScene(id)
          return (
            <div key={id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-slate-200">📖 {s?.title || '???'}</span>
              <button
                type="button"
                onClick={() => handleRemove(id)}
                className="text-slate-500 hover:text-red-400 text-xs flex-shrink-0"
              >
                ✕
              </button>
            </div>
          )
        })}

        {Array.from({ length: openSlots }).map((_, i) => (
          <div key={`slot-${i}`} className="flex gap-1">
            <select
              value=""
              onChange={(e) => handleSelect(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
            >
              <option value="">Подчинить сцену событию...</option>
              {available.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
        ))}

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setOpenSlots((s) => s + 1)}
            disabled={available.length === 0}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-2 py-1 rounded text-xs"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}