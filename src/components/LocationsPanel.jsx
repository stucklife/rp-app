import { useMemo, useState } from 'react'

export default function LocationsPanel({ api }) {
  const { locations, update, remove, create, loading } = api
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)

  // Собираем дерево
  const tree = useMemo(() => {
    const byParent = new Map()
    locations.forEach((l) => {
      const key = l.parent_id || '__root__'
      if (!byParent.has(key)) byParent.set(key, [])
      byParent.get(key).push(l)
    })

    // Сортируем каждую группу по имени
    for (const arr of byParent.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name))
    }

    // Рекурсивный обход
    const result = []
    function walk(parentId, depth) {
      const children = byParent.get(parentId) || []
      for (const loc of children) {
        result.push({ ...loc, _depth: depth })
        walk(loc.id, depth + 1)
      }
    }
    walk('__root__', 0)
    return result
  }, [locations])

  // Фильтр по поиску (ищем по имени или описанию)
  const visible = useMemo(() => {
    if (!search) return tree
    const q = search.toLowerCase()
    return tree.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.short_desc || '').toLowerCase().includes(q) ||
        (l.long_desc || '').toLowerCase().includes(q)
    )
  }, [tree, search])

  function openNew(parentId = null) {
    setEditing({
      id: null,
      form: {
        name: '',
        short_desc: '',
        long_desc: '',
        parent_id: parentId || '',
      },
    })
  }

  function openEdit(l) {
    setEditing({
      id: l.id,
      form: {
        name: l.name || '',
        short_desc: l.short_desc || '',
        long_desc: l.long_desc || '',
        parent_id: l.parent_id || '',
      },
    })
  }

  async function handleSave() {
    const f = editing.form
    if (!f.name.trim()) return

    const payload = {
      name: f.name.trim(),
      short_desc: f.short_desc.trim() || null,
      long_desc: f.long_desc.trim() || null,
      parent_id: f.parent_id || null,
    }

    if (editing.id) {
      await update(editing.id, payload)
    } else {
      await create(payload)
    }
    setEditing(null)
  }

  async function handleDelete() {
    const hasChildren = locations.some((l) => l.parent_id === editing.id)
    const msg = hasChildren
      ? 'Удалить локацию? Дочерние локации останутся, но потеряют родителя.'
      : 'Удалить локацию? Она исчезнет из списка, но останется в истории.'
    if (!confirm(msg)) return
    await remove(editing.id)
    setEditing(null)
  }

  // --- Форма редактирования ---
  if (editing) {
    const f = editing.form
    const set = (patch) => setEditing({ ...editing, form: { ...f, ...patch } })

    // Опции для родителя: все локации, кроме самой себя и её потомков
    // (чтобы не сделать циклическую ссылку)
    const descendants = new Set()
    function collectDescendants(id) {
      locations.forEach((l) => {
        if (l.parent_id === id) {
          descendants.add(l.id)
          collectDescendants(l.id)
        }
      })
    }
    if (editing.id) collectDescendants(editing.id)

    const parentOptions = [
      { value: '', label: '— корневая —' },
      ...tree
        .filter((l) => l.id !== editing.id && !descendants.has(l.id))
        .map((l) => ({
          value: l.id,
          label: '  '.repeat(l._depth) + l.name,
        })),
    ]

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
            {editing.id ? 'Редактирование' : 'Новая локация'}
          </span>
        </div>

        <Field label="Название">
          <input
            value={f.name}
            onChange={(e) => set({ name: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
            autoFocus
          />
        </Field>

        <Field label="Краткое описание">
          <input
            value={f.short_desc}
            onChange={(e) => set({ short_desc: e.target.value })}
            placeholder="Одна строка для списка"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
          />
        </Field>

        <Field label="Подробное описание">
          <textarea
            value={f.long_desc}
            onChange={(e) => set({ long_desc: e.target.value })}
            rows={6}
            placeholder="Всё, что знаете об этом месте"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600 resize-none"
          />
        </Field>

        <Field label="Внутри локации">
          <select
            value={f.parent_id}
            onChange={(e) => set({ parent_id: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
          >
            {parentOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
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

  // --- Список ---
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-800 space-y-2 flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по локациям..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-slate-600"
          />
          <button
            onClick={() => openNew()}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm"
          >
            + Новая
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="p-4 text-slate-500 text-sm">Загрузка...</div>}
        {!loading && visible.length === 0 && (
          <div className="p-4 text-slate-500 text-sm text-center">
            {search ? 'Ничего не найдено' : 'Локаций пока нет'}
          </div>
        )}
        {visible.map((l) => (
          <button
            key={l.id}
            onClick={() => openEdit(l)}
            className="w-full text-left px-4 py-2.5 border-b border-slate-800 hover:bg-slate-800/50 transition flex items-start gap-2"
            style={{ paddingLeft: `${16 + l._depth * 20}px` }}
          >
            <span className="text-slate-500 flex-shrink-0 mt-0.5">
              {l._depth > 0 ? '└' : '📍'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{l.name}</div>
              {l.short_desc && (
                <div className="text-slate-400 text-xs mt-0.5 truncate">
                  {l.short_desc}
                </div>
              )}
            </div>
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