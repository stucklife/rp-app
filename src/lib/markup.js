// Парсер простой разметки: **текст** → действие (курсив, серый).
// Работает даже внутри слова: "пры**сделал рывок**жок" → ["пры", { italic: "сделал рывок" }, "жок"].
// Возвращает массив частей: строки и объекты { italic: string }.

export function parseActions(text) {
  if (text == null) return []
  const str = String(text)

  const parts = []
  let cursor = 0

  while (cursor < str.length) {
    const start = str.indexOf('**', cursor)
    if (start === -1) {
      parts.push(str.slice(cursor))
      break
    }
    const end = str.indexOf('**', start + 2)
    if (end === -1) {
      parts.push(str.slice(cursor))
      break
    }

    if (start > cursor) {
      parts.push(str.slice(cursor, start))
    }

    const inner = str.slice(start + 2, end)
    if (inner.length > 0) {
      parts.push({ italic: inner })
    }

    cursor = end + 2
  }

  return parts.filter((p) => {
    if (typeof p === 'string') return p.length > 0
    return true
  })
}