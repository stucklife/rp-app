import { useEffect, useRef, useState } from 'react'

export default function MessageContextMenu({ x, y, message, currentUser, onClose, onEdit, onQuote, onCopy, onDelete }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: x, top: y })

  // Клик вне — закрыть
  useEffect(() => {
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Проверка границ экрана после монтирования
  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = x
    let top = y
    if (left + rect.width > vw - 8) left = vw - rect.width - 8
    if (top + rect.height > vh - 8) top = vh - rect.height - 8
    if (left < 8) left = 8
    if (top < 8) top = 8
    setPos({ left, top })
  }, [x, y])

  return (
    <div
      ref={ref}
      className="fixed z-[200] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl min-w-[180px] py-1 overflow-hidden"
      style={{ left: pos.left, top: pos.top }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem icon="✎" label="Редактировать" onClick={() => { onEdit(message); onClose() }} />
      <MenuItem icon="💬" label="Цитировать" onClick={() => { onQuote(message); onClose() }} />
      <MenuItem icon="📋" label="Копировать текст" onClick={() => { onCopy(message); onClose() }} />
      <div className="h-px bg-slate-700 my-1" />
      <MenuItem
        icon="🗑"
        label="Удалить"
        danger
        onClick={() => { onDelete(message); onClose() }}
      />
    </div>
  )
}

function MenuItem({ icon, label, danger, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2.5 transition ${
        danger
          ? 'text-red-300 hover:bg-red-900/40'
          : 'text-slate-200 hover:bg-slate-700'
      }`}
    >
      <span className="w-4 text-center">{icon}</span>
      <span>{label}</span>
    </button>
  )
}