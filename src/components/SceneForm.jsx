import { useState } from 'react'

export default function SceneForm({ scene, locations, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState({
    title: scene?.title || '',
    description: scene?.description || '',
    location_id: scene?.location_id || '',
    time_label: scene?.time_label || '',
    status: scene?.status || 'active',
  })

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const isEdit = Boolean(scene?.id)

  async function handleSave() {
    if (!form.title.trim()) return
    await onSave({
      title: form.title.trim(),
      description: form.description.trim() || null,
      location_id: form.location_id || null,
      time_label: form.time_label.trim() || null,
      status: form.status,
    })
  }

  // Связанные события (только для редактирования)
  const linkedEvents = scene?.scene_event_links?.map((l) => l.story_events).filter(Boolean) || []

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-white text-sm"
        >
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
          placeholder="Что происходит в этой сцене"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600 resize-none"
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

      <Field label="Время (свободный текст)">
        <input
          value={form.time_label}
          onChange={(e) => set({ time_label: e.target.value })}
          placeholder="3 дня спустя, вечер первого дня…"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
        />
      </Field>

      <Field label="Статус">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set({ status: 'active' })}
            className={`flex-1 py-2 rounded-lg text-sm ${
              form.status === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            Активная
          </button>
          <button
            type="button"
            onClick={() => set({ status: 'archived' })}
            className={`flex-1 py-2 rounded-lg text-sm ${
              form.status === 'archived'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            Архив
          </button>
        </div>
      </Field>

      {isEdit && linkedEvents.length > 0 && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Связанные события истории
          </label>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 space-y-1">
            {linkedEvents.map((e) => (
              <div key={e.id} className="text-sm text-slate-300 flex items-center gap-2">
                <span>📌</span>
                <span className="truncate">{e.title}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Редактирование связей будет в следующем шаге
          </p>
        </div>
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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}