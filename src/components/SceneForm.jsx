import { useState } from 'react'
import { dateToX, xToDate, normalizeDate } from '../lib/dates'

export default function SceneForm({ scene, locations, gameTime, cursorX, allStoryEvents, onSave, onDelete, onCancel, saving }) {
  // Достаём game_time текущей сцены
  const currentTime = scene?.game_time_id
    ? (gameTime || []).find((t) => t.id === scene.game_time_id)
    : null

  // Связанные события текущей сцены
  const linkedEventIds = scene?.scene_event_links?.map((l) => l.story_event?.id).filter(Boolean) || []

  const [form, setForm] = useState({
    title: scene?.title || '',
    description: scene?.description || '',
    location_id: scene?.location_id || '',
    time_label: scene?.time_label || '',
    status: scene?.status || 'active',
    useManualDates: Boolean(currentTime),
    start_date_text: currentTime?.start_date_text || '',
    start_bc: currentTime?.start_bc || false,
    end_date_text: currentTime?.end_date_text || '',
    end_bc: currentTime?.end_bc || false,
    useExistingEvents: linkedEventIds.length > 0,
    storyEventIds: linkedEventIds,
  })

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const isEdit = Boolean(scene?.id)

  // Вычисляем координаты из введённых дат или курсора
  function computeCoords() {
    if (!form.useManualDates) {
      // Из курсора
      const c = cursorX ?? 0
      return { start_x: c, end_x: c }
    }
    // Из дат
    let startX = null
    let endX = null

    if (form.start_date_text) {
      startX = dateToX(form.start_date_text, form.start_bc)
    }
    if (form.end_date_text) {
      endX = dateToX(form.end_date_text, form.end_bc)
    }

    // Автозаполнение: если только одно — оба равны
    if (startX != null && endX == null) endX = startX
    if (endX != null && startX == null) startX = endX

    if (startX == null && endX == null) {
      const c = cursorX ?? 0
      return { start_x: c, end_x: c }
    }
    return { start_x: startX, end_x: endX }
  }

  async function handleSave() {
    if (!form.title.trim()) return

    if (form.useManualDates) {
      const hasStart = form.start_date_text && dateToX(form.start_date_text, form.start_bc) != null
      const hasEnd = form.end_date_text && dateToX(form.end_date_text, form.end_bc) != null

      if (!hasStart && !hasEnd) {
        alert('Введите хотя бы одну дату в формате ДД.ММ.ГГГГ')
        return
      }
      if (form.start_date_text && !hasStart) {
        alert('Неверный формат даты начала (ДД.ММ.ГГГГ)')
        return
      }
      if (form.end_date_text && !hasEnd) {
        alert('Неверный формат даты окончания (ДД.ММ.ГГГГ)')
        return
      }

      const coords = computeCoords()
      if (coords.end_x < coords.start_x) {
        alert('Дата окончания не может быть раньше даты начала')
        return
      }
    }

    const coords = computeCoords()

    // Если конец не указан, но есть начало — копируем начало в конец
    let startText = null
    let startBc = false
    let endText = null
    let endBc = false

    if (form.useManualDates) {
      startText = form.start_date_text ? normalizeDate(form.start_date_text) : null
      startBc = form.start_bc || false

      if (form.end_date_text) {
        endText = normalizeDate(form.end_date_text)
        endBc = form.end_bc || false
      } else if (startText) {
        endText = startText
        endBc = startBc
      }
    }

    await onSave({
      title: form.title.trim(),
      description: form.description.trim() || null,
      location_id: form.location_id || null,
      time_label: form.time_label.trim() || null,
      status: form.status,
      start_x: coords.start_x,
      end_x: coords.end_x,
      start_date_text: startText,
      start_bc: startBc,
      end_date_text: endText,
      end_bc: endBc,
      storyEventIds: form.useExistingEvents && form.storyEventIds.length > 0
        ? form.storyEventIds
        : null,
    })
  }

  // Для отображения: если чекбокс выключен — показываем дату из курсора
  const cursorDate = (() => {
    if (cursorX == null) return null
    const { text, bc } = xToDate(cursorX)
    if (!text) return null
    return bc ? `${text} BC` : text
  })()

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onCancel} className="text-slate-400 hover:text-white text-sm">
          ← Назад
        </button>
        <span className="text-slate-500 text-sm">
          {isEdit ? 'Редактирование сцены' : 'Новая сцена'}
        </span>
      </div>

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
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-slate-600"
        />
      </Field>

      <Field label="Локация">
        <select
          value={form.location_id}
          onChange={(e) => set({ location_id: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
        >
          <option value="">— не выбрана —</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Комментарий ко времени (опционально)">
        <input
          value={form.time_label}
          onChange={(e) => set({ time_label: e.target.value })}
          placeholder="3 дня спустя, вечер первого дня…"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
        />
      </Field>

      <div className="border-t border-slate-800 pt-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.useManualDates}
            onChange={(e) => set({ useManualDates: e.target.checked })}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm text-slate-300">Указать дату вручную</span>
        </label>

        {form.useManualDates ? (
          <>
            {/* НАЧАЛО */}
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
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-600"
                />
                <label className="flex items-center gap-1 cursor-pointer select-none">
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

            {/* КОНЕЦ */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Окончание (опционально, = началу если пусто)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.end_date_text}
                  onChange={(e) => set({ end_date_text: maskDate(e.target.value) })}
                  placeholder="если пусто = как начало"
                  maxLength={12}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-600"
                />
                <label className="flex items-center gap-1 cursor-pointer select-none">
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
        ) : (
          <div className="text-sm text-slate-400 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
            📅 {cursorDate ? `≈ ${cursorDate}` : 'Время из курсора'}
          </div>
        )}

        {scene?.id && (
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer hover:text-slate-400">Подробнее (отладка)</summary>
            <div className="mt-2 bg-slate-800 border border-slate-700 rounded-lg p-2 font-mono">
              game_time_id: {scene.game_time_id ?? '—'}
            </div>
          </details>
        )}
      </div>

      <Field label="Статус">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set({ status: 'active' })}
            className={`flex-1 py-2 rounded-lg text-sm ${
              form.status === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Активная
          </button>
          <button
            type="button"
            onClick={() => set({ status: 'archived' })}
            className={`flex-1 py-2 rounded-lg text-sm ${
              form.status === 'archived' ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Архив
          </button>
        </div>
      </Field>

      <div className="border-t border-slate-800 pt-3">
        <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
          <input
            type="checkbox"
            checked={form.useExistingEvents}
            onChange={(e) => set({ useExistingEvents: e.target.checked })}
            className="w-4 h-4 accent-blue-600"
          />
          <span className="text-sm text-slate-300">
            Привязать к существующим событиям
          </span>
        </label>

        {form.useExistingEvents ? (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 space-y-2">
            {form.storyEventIds.map((id) => {
              const evt = (allStoryEvents || []).find((e) => e.id === id)
              return (
                <div key={id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-200">
                    &lt;e&gt; {evt?.title || '???'}
                  </span>
                  <button
                    type="button"
                    onClick={() => set({
                      storyEventIds: form.storyEventIds.filter((x) => x !== id),
                    })}
                    className="text-slate-500 hover:text-red-400 text-xs flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
            <div className="flex gap-1 pt-1">
              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value
                  if (!id) return
                  set({
                    storyEventIds: [...form.storyEventIds, id],
                  })
                  e.target.value = ''
                }}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
              >
                <option value="">Добавить событие...</option>
                {(allStoryEvents || [])
                  .filter((e) => !form.storyEventIds.includes(e.id))
                  .map((e) => (
                    <option key={e.id} value={e.id}>&lt;e&gt; {e.title}</option>
                  ))}
              </select>
            </div>
            {form.storyEventIds.length === 0 && (
              <p className="text-[10px] text-yellow-400">
                ⚠️ Не выбрано ни одного события. При сохранении создастся новое событие-пустышка.
              </p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-slate-500">
            При сохранении будет создано новое событие с названием сцены
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || !form.title.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 rounded-lg text-sm font-medium"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

// Маска: пользователь вводит только цифры, точки ставятся автоматически
// 01031800 → 01.03.1800
function maskDate(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (!digits) return ''

  let result = ''
  result += digits.slice(0, 2)
  if (digits.length >= 3) {
    result += '.' + digits.slice(2, 4)
  }
  if (digits.length >= 5) {
    result += '.' + digits.slice(4, 8)
  }
  return result
}