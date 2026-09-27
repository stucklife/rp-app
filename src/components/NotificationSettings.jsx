import { useState } from 'react'

const TYPE_LABELS = {
  messages: 'Сообщения',
  scenes: 'Сцены',
  references: 'Справочники',
}

const SOURCE_LABELS = {
  user1: 'User 1',
  user2: 'User 2',
  narrator: 'Narrator',
}

export default function NotificationSettings({ settings, update, toggleType, toggleSource }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-t border-slate-800 flex-shrink-0">
      {/* Строка с чекбоксом и шестерёнкой */}
      <div className="flex items-center justify-between px-3 py-2">
        <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="w-4 h-4 accent-blue-600 flex-shrink-0"
          />
          <span className={`text-sm truncate ${settings.enabled ? 'text-slate-300' : 'text-slate-500'}`}>
            🔔 Уведомления
          </span>
        </label>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-slate-800 text-sm transition ${
            expanded ? 'text-white bg-slate-800' : ''
          }`}
          title="Настройки уведомлений"
        >
          ⚙️
        </button>
      </div>

      {/* Раскрывающиеся детали */}
      {expanded && settings.enabled && (
        <div className="px-3 pb-3 space-y-3">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">
              Типы
            </div>
            <div className="space-y-1">
              {Object.keys(TYPE_LABELS).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.types[t]}
                    onChange={() => toggleType(t)}
                    className="w-3.5 h-3.5 accent-blue-600"
                  />
                  <span className="text-xs text-slate-300">{TYPE_LABELS[t]}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5">
              Источники
            </div>
            <div className="space-y-1">
              {Object.keys(SOURCE_LABELS).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.sources[s]}
                    onChange={() => toggleSource(s)}
                    className="w-3.5 h-3.5 accent-blue-600"
                  />
                  <span className="text-xs text-slate-300">{SOURCE_LABELS[s]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}