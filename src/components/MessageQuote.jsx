import { AUTHOR_COLORS, AUTHOR_LABELS } from '../lib/constants'

export default function MessageQuote({ quote, onJump }) {
  if (!quote) {
    return (
      <div className="text-xs text-slate-500 italic mb-1 pl-2 border-l-2 border-slate-600">
        сообщение недоступно
      </div>
    )
  }

  const author = quote.character_name || AUTHOR_LABELS[quote.author] || quote.author
  const preview = (quote.content || '').slice(0, 80)
  const truncated = (quote.content || '').length > 80

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onJump?.(quote.id)
      }}
      className="w-full text-left mb-1.5 pl-2 py-0.5 border-l-2 border-slate-500 hover:border-slate-300 transition-colors group"
    >
      <div className={`text-[11px] font-semibold ${AUTHOR_COLORS[quote.author] || 'text-slate-400'}`}>
        {author}
      </div>
      <div className="text-[11px] text-slate-400 truncate group-hover:text-slate-300">
        {preview}{truncated ? '…' : ''}
      </div>
    </button>
  )
}