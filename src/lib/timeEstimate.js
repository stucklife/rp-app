import { xToDate } from './dates'

// Обратный парсинг координаты в дату.
// Возвращает строку с '≈' если это не точная дата из справочника,
// или точную дату если совпадает с game_time.
export function estimateDateFromX(x, times) {
  if (x == null) return null

  // Если координата совпадает с какой-то записью game_time — возвращаем точную дату
  if (times && times.length > 0) {
    for (const t of times) {
      if (x >= t.start_x && x <= t.end_x) {
        // Внутри интервала
        if (t.start_date === t.end_date) return t.start_date
        return `${t.start_date} — ${t.end_date}`
      }
    }
  }

  // Иначе — вычисляем приблизительную дату
  const date = xToDate(x)
  return date ? `≈ ${date}` : null
}

// Отображение времени сцены/события
export function displayTime(item, times) {
  if (!item) return ''
  
  // Если есть game_time — точная дата
  if (item.game_time_id && times) {
    const t = times.find((x) => x.id === item.game_time_id)
    if (t) {
      if (t.start_date === t.end_date) return t.start_date
      return `${t.start_date} — ${t.end_date}`
    }
  }
  
  // Иначе — из координат
  if (item.x_start != null) {
    return estimateDateFromX(item.x_start, times)
  }
  
  return ''
}