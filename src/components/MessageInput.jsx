import { useState } from 'react'
import { AUTHOR_LABELS } from '../lib/constants'
import { parseFormula } from '../lib/dice'
import CharacterPicker from './CharacterPicker'

export default function MessageInput({
  onSend,
  disabled,
  replyTo,
  onCancelReply,
  characters,
  characterId,
  onCharacterChange,
  onDiceRoll,
}) {
  const [text, setText] = useState('')
  const [narrMode, setNarrMode] = useState(false)

  const handleSubmit = (e) => {
    if (e) e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    // Slash-команды: /roll 2d6+3 или /r 2d6+3
    const rollMatch = trimmed.match(/^\/(?:roll|r)\s+(.+)$/i)
    if (rollMatch) {
      const formula = rollMatch[1].trim()
      if (parseFormula(formula)) {
        onDiceRoll?.({ formula })
        setText('')
        return
      }
      return
    }

    // Slash-команда: /narr <текст> — нарратив
    const narrMatch = trimmed.match(/^\/narr\s+(.+)$/i)
    if (narrMatch) {
      const narrText = narrMatch[1].trim()
      if (narrText) {
        onSend(narrText, { isNarration: true })
        setText('')
      }
      return
    }

    // Кнопка «Нарратив» активна — отправляем как нарратив
    if (narrMode) {
      onSend(trimmed, { isNarration: true })
      setText('')
      setNarrMode(false)
      return
    }

    onSend(trimmed)
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
    if (e.key === 'Escape' && replyTo) {
      onCancelReply?.()
    }
  }

  const quoteAuthor = replyTo
    ? (replyTo.character_name || AUTHOR_LABELS[replyTo.author] || replyTo.author)
    : null

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-slate-950 border-t border-slate-800"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      {replyTo && (
        <div className="mb-2 flex items-start gap-2 bg-slate-900 border-l-2 border-blue-500 rounded px-2 py-1.5">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-blue-400">
              {quoteAuthor}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {replyTo.content?.slice(0, 80) || ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-slate-500 hover:text-white w-6 h-6 flex items-center justify-center flex-shrink-0"
            title="Отменить"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <CharacterPicker
              characters={characters}
              value={characterId}
              onChange={onCharacterChange}
              compact
            />
            <button
              type="button"
              onClick={() => setNarrMode((v) => !v)}
              disabled={disabled}
              className={`rounded px-2 py-0.5 text-xs transition ${
                narrMode
                  ? 'bg-purple-700 hover:bg-purple-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              } disabled:opacity-50`}
              title="Режим нарратива"
            >
              📖
            </button>
            {narrMode && (
              <span className="text-[10px] text-purple-400 italic">
                режим нарратива
              </span>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            disabled={disabled}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-slate-600 disabled:opacity-50 max-h-32"
            style={{ minHeight: '38px' }}
          />
        </div>

        <button
          type="button"
          onClick={() => onDiceRoll?.()}
          disabled={disabled}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg px-3 py-2 text-lg transition self-end"
          style={{ minHeight: '38px' }}
          title="Бросить кубы"
        >
          🎲
        </button>

        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition self-end"
          style={{ minHeight: '38px' }}
        >
          ➤
        </button>
      </div>
    </form>
  )
}