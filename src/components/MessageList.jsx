import { useEffect, useMemo, useRef, useState } from 'react'
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
  searchQuery = '',
  sceneTitle,
}) {
  const bottomRef = useRef(null)
  const [menu, setMenu] = useState(null)
  const [highlightId, setHighlightId] = useState(null)
  const [editingId, setEditingId] = useState(null)

  // Поиск
  const [currentMatch, setCurrentMatch] = useState(0)
  const [listOpen, setListOpen] = useState(false)

  // Автоскролл вниз — только если поиск не активен
  useEffect(() => {
    if (!searchQuery) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, searchQuery])

  // Список сообщений, где найдено совпадение
  const matchedMessages = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return messages.filter((m) => (m.content || '').toLowerCase().includes(q))
  }, [messages, searchQuery])

  // Сброс текущего совпадения при смене запроса
  useEffect(() => {
    setCurrentMatch(matchedMessages.length > 0 ? 1 : 0)
  }, [searchQuery])

  // Автоскролл к текущему совпадению при навигации
  useEffect(() => {
    if (!searchQuery || matchedMessages.length === 0) return
    const msg = matchedMessages[currentMatch - 1]
    if (!msg) return
    const el = document.getElementById(`msg-${msg.id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentMatch, searchQuery, matchedMessages.length])

  function nextMatch() {
    if (matchedMessages.length === 0) return
    setCurrentMatch((n) => (n >= matchedMessages.length ? 1 : n + 1))
  }

  function prevMatch() {
    if (matchedMessages.length === 0) return
    setCurrentMatch((n) => (n <= 1 ? matchedMessages.length : n - 1))
  }

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
    <div className="flex flex-col h-full min-h-0">
      {/* Панель навигации по совпадениям — видна только когда есть запрос */}
      {searchQuery.trim() && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800 bg-slate-950 flex-shrink-0">
          <span className="text-[11px] text-slate-400 whitespace-nowrap">
            {matchedMessages.length > 0
              ? `${currentMatch} / ${matchedMessages.length}`
              : 'Ничего не найдено'}
          </span>
          <button
            type="button"
            onClick={prevMatch}
            disabled={matchedMessages.length === 0}
            className="text-slate-400 hover:text-white disabled:opacity-40 text-xs px-1"
            title="Предыдущее"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={nextMatch}
            disabled={matchedMessages.length === 0}
            className="text-slate-400 hover:text-white disabled:opacity-40 text-xs px-1"
            title="Следующее"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => setListOpen(true)}
            disabled={matchedMessages.length === 0}
            className="text-[11px] text-slate-300 hover:text-white disabled:opacity-40 px-1"
            title="Список совпадений"
          >
            Список
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col gap-2 p-3 sm:p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              id={`msg-${m.id}`}
              className={`transition-colors duration-500 ${
                m.kind === 'narration' ? '' : 'rounded-2xl'
              } ${highlightId === m.id ? 'bg-yellow-500/20' : ''}`}
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
                searchQuery={searchQuery}
              />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {listOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
          onClick={() => setListOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="text-sm font-medium">
                Найдено: {matchedMessages.length}
              </div>
              <button
                type="button"
                onClick={() => setListOpen(false)}
                className="text-slate-400 hover:text-white text-lg w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {matchedMessages.map((m, i) => {
                const authorName =
                  (characters || []).find((c) => c.id === m.character_id)?.name
                  || m.character_name
                  || m.author
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setListOpen(false)
                      setCurrentMatch(i + 1)
                      setTimeout(() => jumpToMessage(m.id), 50)
                    }}
                    className="w-full text-left px-4 py-2.5 border-b border-slate-800 hover:bg-slate-800/60 transition"
                  >
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-300">
                        {authorName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(m.created_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 line-clamp-2">
                      {m.content}
                    </div>
                  </button>
                )
              })}
              {matchedMessages.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  Ничего не найдено
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
    </div>
  )
}