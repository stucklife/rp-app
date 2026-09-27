// Простой store для toast-уведомлений.
// Компоненты подписываются через useSyncExternalStore.

let toasts = []
let listeners = new Set()

function emit() {
  for (const l of listeners) l()
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return toasts
}

export function addToast({ type, title, preview, icon, onAction, duration = 8000 }) {
  const id = crypto.randomUUID()
  toasts = [...toasts, { id, type, title, preview, icon, onAction, duration, createdAt: Date.now() }]
  emit()
  return id
}

export function removeToast(id) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function clearToasts() {
  toasts = []
  emit()
}