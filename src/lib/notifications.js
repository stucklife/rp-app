import { useEffect, useState } from 'react'

const ALL_TYPES = ['messages', 'scenes', 'references']
const ALL_SOURCES = ['user1', 'user2', 'narrator']

const DEFAULTS = {
  enabled: true,
  types: { messages: true, scenes: true, references: true },
  sources: { user1: true, user2: true, narrator: true },
}

function storageKey(userId) {
  return `rp.notifications.${userId}`
}

function loadSettings(userId) {
  if (!userId) return DEFAULTS
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return {
      enabled: parsed.enabled ?? DEFAULTS.enabled,
      types: { ...DEFAULTS.types, ...(parsed.types || {}) },
      sources: { ...DEFAULTS.sources, ...(parsed.sources || {}) },
    }
  } catch {
    return DEFAULTS
  }
}

export function useNotificationSettings(userId) {
  const [settings, setSettings] = useState(() => loadSettings(userId))

  // При смене пользователя — перечитываем его настройки
  useEffect(() => {
    setSettings(loadSettings(userId))
  }, [userId])

  // Сохраняем при изменении
  useEffect(() => {
    if (!userId) return
    localStorage.setItem(storageKey(userId), JSON.stringify(settings))
  }, [userId, settings])

  function update(patch) {
    setSettings((s) => ({ ...s, ...patch }))
  }

  function toggleType(type) {
    setSettings((s) => ({ ...s, types: { ...s.types, [type]: !s.types[type] } }))
  }

  function toggleSource(source) {
    setSettings((s) => ({ ...s, sources: { ...s.sources, [source]: !s.sources[source] } }))
  }

  // Проверка: должен ли показываться toast
  function shouldNotify({ type, source }) {
    if (!settings.enabled) return false
    if (type && !settings.types[type]) return false
    if (source && !settings.sources[source]) return false
    return true
  }

  return { settings, update, toggleType, toggleSource, shouldNotify }
}

export const NOTIFICATION_TYPES = ALL_TYPES
export const NOTIFICATION_SOURCES = ALL_SOURCES