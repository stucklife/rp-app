import { useState, useRef, useEffect } from 'react'
import { AUTHOR_COLORS, AUTHOR_LABELS, AUTHOR_BG } from '../lib/constants'
import MessageQuote from './MessageQuote'
import CharacterPicker from './CharacterPicker'

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({
  message,
  currentUser,
  characters,
  isEditing,
  onStartEdit,
  onStopEdit,
  onSaveEdit,
  onContextMenu,
  onJumpToMessage,
}) {
  const {
    author,
    kind,
    character_id,
    character_name,
    content,
    created_at,
    edited_at,
    reply_to,
  } = message

  const isOwn = author === currentUser
  const [draft, setDraft] = useState(content || '')
  const [draftCharId, setDraftCharId] = useState(character_id || null)
  const textareaRef = useRef(null)

  // Актуальное имя персонажа: сначала по character_id, потом по character_name (fallback)
  const linkedCharacter = characters.find((c) => c.id === character_id)
  const displayName =
    linkedCharacter?.name ||
    character_name ||
    AUTHOR_LABELS[author] ||
    author

  useEffect(() => {
    if (isEditing) {
      setDraft(content || '')
      setDraftCharId(character_id || null)
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.setSelectionRange(
          (content || '').length,
          (content || '').length
        )
      }, 0)
    }
  }, [isEditing, content, character_id])

  if (kind === 'system') {
    return (
      <div className="text-center text-slate-500 italic text-sm py-2 px-4">
        — {content} —
      </div>
    )
  }

  function openMenu(e) {
    if (isEditing) return
    e.preventDefault()
    const clientX = e.clientX ?? 0
    const clientY = e.clientY ?? 0
    onContextMenu?.(message, clientX, clientY)
  }

  async function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) return
    const selectedChar = characters.find((c) => c.id === draftCharId)
    await onSaveEdit({
      content: trimmed,
      character_id: draftCharId,
      character_name: selectedChar?.name || null,
    })
  }

  function handleCancel() {
    onStopEdit()
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        onClick={openMenu}
        onContextMenu={openMenu}
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl border px-3 py-2 transition cursor-pointer hover:border-slate-500 ${AUTHOR_BG[author]} ${
          isEditing ? 'ring-2 ring-blue-500 cursor-default' : ''
        }`}
      >
        {reply_to && <MessageQuote quote={reply_to} onJump={onJumpToMessage} />}

        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()}>
            <div className="mb-1.5">
              <CharacterPicker
                characters={characters}
                value={draftCharId}
                onChange={setDraftCharId}
              />
            </div>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={Math.min(6, Math.max(1, draft.split('\n').length))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:border-slate-600"
            />
            <div className="flex gap-1.5 mt-1.5">
              <button
                onClick={handleSave}
                disabled={!draft.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-3 py-1 rounded text-xs"
              >
                Сохранить
              </button>
              <button
                onClick={handleCancel}
                className="text-slate-400 hover:text-white px-3 py-1 rounded text-xs"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`text-xs font-semibold ${AUTHOR_COLORS[author]}`}>
                {displayName}
              </span>
              <span className="text-[10px] text-slate-500">
                {formatTime(created_at)}
                {edited_at && <span className="ml-1 italic">(изменено)</span>}
              </span>
            </div>
            <div className="text-sm whitespace-pre-wrap break-words">
              {content}
            </div>
          </>
        )}
      </div>
    </div>
  )
}