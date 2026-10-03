import { useState } from 'react'
import { dateToX } from '../lib/dates'

export default function StoryEventForm({
  event,
  allEvents,
  allScenes,
  links,
  onSave,
  onDelete,
  onCancel,
  onLinkEvents,
  onUnlinkEvents,
  onLinkScene,
  onUnlinkScene,
}) {
  const currentTime = event?.game_time
  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    is_global: event?.is_global || false,
    useManualDates: Boolean(currentTime),
    start_date_text: currentTime?.start_date_text || '',
    start_bc: currentTime?.start_bc || false,
    end_date_text: currentTime?.end_date_text || '',
    end_bc: currentTime?.end_bc || false,
  })

  const [openSection, setOpenSection] = useState({
    main: true,
    eventLinks: false,
    sceneLinks: false,
  })

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const toggle = (key) => setOpenSection((s) => ({ ...s, [key]: !s[key] }))
  const isEdit = Boolean(event?.id)

  const safeEvents = Array.isArray(allEvents) ? allEvents : []
  const safeScenes = Array.isArray(allScenes) ? allScenes : []
  const safeLinks = Array.isArray(links) ? links : []

  const parents = safeLinks.filter((l) => l.relation === 'parent_of' && l.to_event_id === event?.id).map((l) => ({ link: l, otherId: l.from_event_id }))
  const children = safeLinks.filter((l) => l.relation === 'parent_of' && l.from_event_id === event?.id).map((l) => ({ link: l, otherId: l.to_event_id }))
  const followsFrom = safeLinks.filter((l) => l.relation === 'leads_to' && l.to_event_id === event?.id).map((l) => ({ link: l, otherId: l.from_event_id }))
  const leadsTo = safeLinks.filter((l) => l.relation === 'leads_to' && l.from_event_id === event?.id).map((l) => ({ link: l, otherId: l.to_event_id }))

  const linkedScenes = event?.scene_event_links?.map((sel) => sel.scene).filter(Boolean) || []

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
    })
  }

  function getEventTitle(id) {
    return safeEvents.find((e) => e.id === id)?.title || '???'
  }

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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.start_date_text}
                  onChange={(e) => set({ start_date_text: maskDate(e.target.value) })}
                  placeholder="01.03.1800"
                  maxLength={12}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
                />
                <label className="flex items-center gap-1">
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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.end_date_text}
                  onChange={(e) => set({ end_date_text: maskDate(e.target.value) })}
                  placeholder="если пусто = как начало"
                  maxLength={12}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
                />
                <label className="flex items-center gap-1">
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
            items={parents}
            allEvents={safeEvents}
            currentId={event.id}
            getTitle={getEventTitle}
            onAdd={(id) => onLinkEvents(id, event.id, 'parent_of')}
            onRemove={(link) => onUnlinkEvents(link.id)}
            placeholder="Выбрать родителя..."
          />
          <LinkBlock
            title="Дети (подчинены этому событию)"
            items={children}
            allEvents={safeEvents}
            currentId={event.id}
            getTitle={getEventTitle}
            onAdd={(id) => onLinkEvents(event.id, id, 'parent_of')}
            onRemove={(link) => onUnlinkEvents(link.id)}
            placeholder="Выбрать ребёнка..."
          />
          <LinkBlock
            title="Следует из"
            items={followsFrom}
            allEvents={safeEvents}
            currentId={event.id}
            getTitle={getEventTitle}
            onAdd={(id) => onLinkEvents(id, event.id, 'leads_to')}
            onRemove={(link) => onUnlinkEvents(link.id)}
            placeholder="Это событие следует из..."
          />
          <LinkBlock
            title="Приводит к"
            items={leadsTo}
            allEvents={safeEvents}
            currentId={event.id}
            getTitle={getEventTitle}
            onAdd={(id) => onLinkEvents(event.id, id, 'leads_to')}
            onRemove={(link) => onUnlinkEvents(link.id)}
            placeholder="Это событие приводит к..."
          />
        </Section>
      )}

      {isEdit && (
        <Section title="Сцены, раскрывающие событие" open={openSection.sceneLinks} onToggle={() => toggle('sceneLinks')}>
          <SceneLinksBlock
            linkedScenes={linkedScenes}
            allScenes={safeScenes}
            onAdd={(sceneId) => onLinkScene(event.id, sceneId)}
            onRemove={(sceneId) => onUnlinkScene(event.id, sceneId)}
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

function LinkBlock({ title, items, allEvents, currentId, getTitle, onAdd, onRemove, placeholder }) {
  const [selected, setSelected] = useState('')
  const available = allEvents.filter(
    (e) => e.id !== currentId && !items.some((it) => it.otherId === e.id)
  )

  async function handleAdd() {
    if (!selected) return
    const result = await onAdd(selected)
    if (result?.error) {
      alert('Не удалось добавить связь: ' + result.error.message)
      return
    }
    setSelected('')
  }

  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{title}</label>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 space-y-1">
        {items.length === 0 && (
          <div className="text-xs text-slate-500 italic">Нет связей</div>
        )}
        {items.map((it) => (
          <div key={it.link.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-slate-200">📌 {getTitle(it.otherId)}</span>
            <button
              type="button"
              onClick={() => onRemove(it.link)}
              className="text-slate-500 hover:text-red-400 text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
        <div className="flex gap-1 pt-1">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
          >
            <option value="">{placeholder}</option>
            {available.map((e) => (
              <option key={e.id} value={e.id}>📌 {e.title}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selected}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-2 py-1 rounded text-xs"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

function SceneLinksBlock({ linkedScenes, allScenes, onAdd, onRemove }) {
  const [selected, setSelected] = useState('')
  const scenes = Array.isArray(allScenes) ? allScenes : []
  const linked = Array.isArray(linkedScenes) ? linkedScenes : []
  const available = scenes.filter((s) => !linked.some((ls) => ls.id === s.id))

  async function handleAdd() {
    if (!selected) return
    await onAdd(selected)
    setSelected('')
  }

  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">
        Подчинённые сцены (раскрывают событие)
      </label>
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 space-y-1">
        {linked.length === 0 && (
          <div className="text-xs text-slate-500 italic">Нет связанных сцен</div>
        )}
        {linked.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-slate-200">📖 {s.title}</span>
            <button
              onClick={() => onRemove(s.id)}
              className="text-slate-500 hover:text-red-400 text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
        <div className="flex gap-1 pt-1">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
          >
            <option value="">Подчинить сцену событию...</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selected}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-2 py-1 rounded text-xs"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}