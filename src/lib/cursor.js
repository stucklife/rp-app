import { useState, useEffect } from 'react'

function storageKey(userId, universeId) {
  return `rp.cursor.${userId}.${universeId}`
}

export function useCursor(userId, universeId) {
  const [cursor, setCursor] = useState(0)

  // Загрузка при смене пользователя/универсума
  useEffect(() => {
    if (!userId || !universeId) {
      setCursor(0)
      return
    }
    const stored = localStorage.getItem(storageKey(userId, universeId))
    setCursor(stored ? Number(stored) : 0)
  }, [userId, universeId])

  // Сохранение при изменении
  useEffect(() => {
    if (!userId || !universeId) return
    localStorage.setItem(storageKey(userId, universeId), String(cursor))
  }, [userId, universeId, cursor])

  return [cursor, setCursor]
}