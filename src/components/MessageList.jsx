import { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'
import MessageContextMenu from './MessageContextMenu'

export default function MessageList({
  messages,
  currentUser,
  characters,
  loading,
  onEditMessage,
  onDeleteMessage,
  onQuoteMessage,
}) {
  const bottomRef = useRef(null)
  const [menu, setMenu] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function jumpToMessage(id) {
    const el = document.getElementById(`msg-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightId(id)
    setTimeout(() => setHighlightId(null), 2000)
  }

  function handleContextMenu(message, x, y) {
    setMenu({ message, x, y })
  }

  function handleCopy(message) {
    navigator.clipboard.writeText(message.content || '').catch(() => {})
  }

  async function handleSaveEdit(id, patch) {
    await onEditMessage(id, patch)
    setEditingId(null)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500">
        Загрузка...
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        Пока нет сообщений. Напиши что-нибудь ↓
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2 p-3 sm:p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            id={`msg-${m.id}`}
            className={`rounded-2xl transition-colors duration-500 ${
              highlightId === m.id ? 'bg-yellow-500/20' : ''
            }`}
          >
                        <MessageBubble
              message={m}
              currentUser={currentUser}
              characters={characters}
              isEditing={editingId === m.id}
              onStartEdit={() => setEditingId(m.id)}
              onStopEdit={() => setEditingId(null)}
              onSaveEdit={(patch) => handleSaveEdit(m.id, patch)}
              onContextMenu={handleContextMenu}
              onJumpToMessage={jumpToMessage}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {menu && (
        <MessageContextMenu
          x={menu.x}
          y={menu.y}
          message={menu.message}
          currentUser={currentUser}
          onClose={() => setMenu(null)}
          onEdit={(msg) => setEditingId(msg.id)}
          onQuote={onQuoteMessage}
          onCopy={handleCopy}
          onDelete={(msg) => onDeleteMessage(msg.id)}
        />
      )}
    </>
  )
}