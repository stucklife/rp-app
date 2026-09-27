import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

export default function MessageList({ messages, currentUser, loading }) {
  const bottomRef = useRef(null)

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

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
    <div className="flex flex-col gap-2 p-3 sm:p-4">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} currentUser={currentUser} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}