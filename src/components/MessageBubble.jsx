import { AUTHOR_COLORS, AUTHOR_LABELS, AUTHOR_BG } from '../lib/constants'

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ message, currentUser }) {
  const { author, kind, character_name, content, created_at } = message
  const isOwn = author === currentUser

  // Системное сообщение — без пузыря, курсивом по центру
  if (kind === 'system') {
    return (
      <div className="text-center text-slate-500 italic text-sm py-2 px-4">
        — {content} —
      </div>
    )
  }

  // Обычная реплика
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl border px-3 py-2 ${AUTHOR_BG[author]}`}
      >
        {/* Имя + время */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-xs font-semibold ${AUTHOR_COLORS[author]}`}>
            {character_name || AUTHOR_LABELS[author]}
          </span>
          <span className="text-[10px] text-slate-500">
            {formatTime(created_at)}
          </span>
        </div>

        {/* Текст */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {content}
        </div>
      </div>
    </div>
  )
}