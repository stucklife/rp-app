import { useEffect, useRef, useState } from 'react'

export default function Toast({ toast, onClose }) {
  const { id, title, preview, icon, onAction, duration } = toast
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef(null)
  const startTimeRef = useRef(Date.now())

  // Авто-скрытие
  useEffect(() => {
    if (!duration) return
    const elapsed = Date.now() - startTimeRef.current
    const remaining = Math.max(0, duration - elapsed)
    const t = setTimeout(() => onClose(id), remaining)
    return () => clearTimeout(t)
  }, [id, duration, onClose])

  // Свайп (только мобильные по сути — жестовые события)
  function onTouchStart(e) {
    startXRef.current = e.touches[0].clientX
    setDragging(true)
  }

  function onTouchMove(e) {
    if (startXRef.current == null) return
    const dx = e.touches[0].clientX - startXRef.current
    setDragX(dx)
  }

  function onTouchEnd() {
    setDragging(false)
    if (Math.abs(dragX) > 80) {
      onClose(id)
    } else {
      setDragX(0)
    }
    startXRef.current = null
  }

  function handleClick(e) {
    // Если был свайп — не считаем как клик
    if (Math.abs(dragX) > 5) return
    if (onAction) onAction()
    onClose(id)
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={handleClick}
      style={{
        transform: `translateX(${dragX}px)`,
        transition: dragging ? 'none' : 'transform 0.2s, opacity 0.2s',
        opacity: Math.max(0.3, 1 - Math.abs(dragX) / 300),
      }}
      className="pointer-events-auto bg-slate-800 border border-slate-700 rounded-lg shadow-2xl px-3 py-2.5 flex items-start gap-2 cursor-pointer select-none max-w-[calc(100vw-1.5rem)] sm:max-w-[380px]"
    >
      {icon && <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{title}</div>
        {preview && (
          <div className="text-xs text-slate-400 truncate mt-0.5">{preview}</div>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose(id)
        }}
        className="text-slate-500 hover:text-white w-5 h-5 flex items-center justify-center flex-shrink-0 text-sm"
        title="Закрыть"
      >
        ✕
      </button>
    </div>
  )
}