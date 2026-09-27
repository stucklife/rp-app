import { useMemo, useState } from 'react'

const OWNER_OPTIONS = [
  { value: '', label: '— нет —' },
  { value: 'user1', label: 'User 1' },
  { value: 'user2', label: 'User 2' },
  { value: 'narrator', label: 'Narrator' },
]

export default function CharactersPanel({ api }) {
  const { characters, update, remove, create, loading } = api
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)

  const visible = useMemo(() => {
    return characters.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      if (filter === 'important' && !c.is_important) return false
      if (filter === 'player' && !c.is_player) return false
      if (filter === 'npc' && c.is_player) return false
      return true
    })
  }, [characters, search, filter])

  function openNew() {
    setEditing({
      id: null,
      form: {
        name: '',
        description: '',
        is_player: true,
        is_important: false,
        owner: '',
        tags: [],
      },
    })
  }

  function openEdit(c) {
    setEditing({
      id: c.id,
      form: {
        name: c.name || '',
        description: c.description || '',
        is_player: c.is_player || false,
        is_important: c.is_important || false,
        owner: c.owner || '',
        tags: c.tags || [],
      },
    })
  }

  async function handleSave() {
    const f = editing.form
    if (!f.name.trim()) return

    const payload = {
      name: f.name.trim(),
      description: f.description.trim() || null,
      is_player: f.is_player,
      is_important: f.is_important,
      owner: f.owner || null,
      tags: f.tags,
    }

    if (editing.id) {
      await update(editing.id, payload)
    } else {
      await create(payload)
    }
    setEditing(null)
  }

  async function handleDelete() {
    if (!confirm('Удалить персонажа? Он исчезнет из списка, но останется в истории.')) return
    await remove(editing.id)
    setEditing(null)
  }

  if (editing) {
    const f = editing.form
    const set = (patch) => setEditing({ ...editing, form: { ...f, ...patch } })

    return (
      <div className="h-full overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setEditing(null)}
            className="text-slate-400 hover:text-white text-sm"
          >
            ← Назад
          </button>
          <span className="text-slate-500 text-sm">
            {editing.id ? 'Редактирование' : 'Новый персонаж'}
          </span>
        </div>

        <Field label="Имя">
          <input
            value={f.name}
            onChange={(e) => set({ name: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
            autoFocus
          />
        </Field>

        <Field label="Описание">
          <textarea
            value={f.description}
            onChange={(e) => set({ description: e.target.value })}
            rows={4}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600 resize-none"
          />
        </Field>

        <div className="flex gap-4">
          <Checkbox
            checked={f.is_player}
            onChange={(v) => set({ is_player: v })}
            label="Персонаж игрока"
          />
          <Checkbox
            checked={f.is_important}
            onChange={(v) => set({ is_important: v })}
            label="Важный ★"
          />
        </div>

        <Field label="Владелец">
          <select
            value={f.owner}
            onChange={(e) => set({ owner: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
          >
            {OWNER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Теги">
          <TagInput tags={f.tags} onChange={(tags) => set({ tags })} />
        </Field>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={!f.name.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 rounded-lg text-sm font-medium"
          >
            Сохранить
          </button>
          {editing.id && (
            <button
              onClick={handleDelete}
              className="bg-red-900/60 hover:bg-red-900 text-red-200 px-4 py-2 rounded-lg text-sm"
            >
              Удалить
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-800 space-y-2 flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-slate-600"
          />
          <button
            onClick={openNew}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm"
          >
            + Новый
          </button>
        </div>

        <div className="flex gap-1 text-xs">
          {[
            { v: 'all', l: 'Все' },
            { v: 'important', l: '★' },
            { v: 'player', l: 'Игроки' },
            { v: 'npc', l: 'NPC' },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`px-2 py-1 rounded ${
                filter === f.v
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="p-4 text-slate-500 text-sm">Загрузка...</div>}
        {!loading && visible.length === 0 && (
          <div className="p-4 text-slate-500 text-sm text-center">
            {search || filter !== 'all' ? 'Ничего не найдено' : 'Персонажей пока нет'}
          </div>
        )}
        {visible.map((c) => (
          <button
            key={c.id}
            onClick={() => openEdit(c)}
            className="w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 transition"
          >
            <div className="flex items-center gap-2">
              {c.is_important && <span className="text-yellow-400">★</span>}
              <span className="font-medium">{c.name}</span>
              {c.is_player && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                  {c.owner || 'игрок'}
                </span>
              )}
            </div>
            {c.description && (
              <div className="text-slate-400 text-xs mt-0.5 line-clamp-2">
                {c.description}
              </div>
            )}
            {c.tags?.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {c.tags.map((t) => (
                  <span key={t} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
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

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-blue-600"
      />
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  )
}

function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('')

  function addTag() {
    const t = input.trim().toLowerCase()
    if (!t) return
    if (tags.includes(t)) {
      setInput('')
      return
    }
    onChange([...tags, t])
    setInput('')
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 flex flex-wrap gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className="text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded flex items-center gap-1"
        >
          {t}
          <button
            type="button"
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className="text-slate-400 hover:text-red-400"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            addTag()
          }
          if (e.key === 'Backspace' && !input && tags.length > 0) {
            onChange(tags.slice(0, -1))
          }
        }}
        onBlur={addTag}
        placeholder={tags.length === 0 ? 'тег + Enter' : ''}
        className="flex-1 min-w-[80px] bg-transparent text-sm focus:outline-none"
      />
    </div>
  )
}