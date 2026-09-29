// Утилита дат и координат.
// Точка отсчёта: 01.01.2000 = 0
// 1 день = 1 единица координаты.
// Поддержка BC: год хранится в астрономической нумерации (1 BC = год 0)

const EPOCH_MS = Date.UTC(2000, 0, 1)
const DAY_MS = 1000 * 60 * 60 * 24

// '01.03.1800' + bc=false → 73049
// '01.03.454' + bc=true → отрицательное число
export function dateToX(dateStr, bc = false) {
  const d = parseDate(dateStr, bc)
  if (!d) return null
  return Math.round((d.getTime() - EPOCH_MS) / DAY_MS)
}

// 73049 → '01.03.1800'
export function xToDate(x) {
  if (x == null) return { text: null, bc: false }
  const d = new Date(EPOCH_MS + Math.round(x) * DAY_MS)
  const year = d.getUTCFullYear()
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')

  if (year <= 0) {
    // Астрономический год 0 = 1 BC, -1 = 2 BC, ...
    return { text: `${day}.${month}.${1 - year}`, bc: true }
  }
  return { text: `${day}.${month}.${year}`, bc: false }
}

// '01.03.1800' + bc=false → Date
// '01.03.454' + bc=true → Date
export function parseDate(str, bc = false) {
  if (!str) return null
  if (str instanceof Date) return str
  const s = String(str).trim()
  const match = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{1,6})$/)
  if (!match) return null

  const [, dd, mm, yy] = match
  const day = Number(dd)
  const month = Number(mm)
  let year = Number(yy)

  // Проверка диапазонов
  if (day < 1 || day > 31) return null
  if (month < 1 || month > 12) return null
  if (year < 1) return null

  if (bc) {
    year = -(year - 1)
  }

  const date = new Date(Date.UTC(2000, 0, 1))
  date.setUTCFullYear(year)
  date.setUTCMonth(month - 1)
  date.setUTCDate(day)

  // Дополнительная проверка: если после set месяц/день сдвинулись,
  // значит такого дня в месяце не существует (например, 31.02)
  if (date.getUTCDate() !== day) return null
  if (date.getUTCMonth() !== month - 1) return null

  return date
}

// Форматирование Date для UI
export function formatDate(d) {
  if (!d) return ''
  const date = d instanceof Date ? d : parseDate(d)
  if (!date) return ''
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  if (year <= 0) return `${day}.${month}.${1 - year} BC`
  return `${day}.${month}.${year}`
}

// Отображение одной даты: если есть текст — используем его, иначе восстанавливаем из x
export function displayDate(x, dateText, bc) {
  if (dateText) return bc ? `${dateText} BC` : dateText
  const { text, bc: isBc } = xToDate(x)
  if (!text) return '—'
  return isBc ? `${text} BC` : text
}

// Отображение интервала
export function displayRange(startX, endX, startText, startBc, endText, endBc) {
  const s = displayDate(startX, startText, startBc)
  const e = displayDate(endX, endText, endBc)
  if (s === e) return s
  return `${s} — ${e}`
}

// Валидация строки даты
export function isValidDate(str) {
  return parseDate(str) !== null
}

// Нормализует дату: 1.3.2222 → 01.03.2222
// Возвращает строку ДД.ММ.ГГГГ с ведущими нулями
export function normalizeDate(str) {
  if (!str) return ''
  const s = String(str).trim()
  const match = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{1,6})$/)
  if (!match) return s

  const [, dd, mm, yy] = match
  const day = String(Number(dd)).padStart(2, '0')
  const month = String(Number(mm)).padStart(2, '0')
  const year = String(Number(yy)).padStart(4, '0')
  return `${day}.${month}.${year}`
}