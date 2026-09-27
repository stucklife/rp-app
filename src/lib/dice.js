// Парсит формулу вида: "2d6", "1d20+3", "1d6+1d8", "2d4+1d6+3", "d20-1"
// Возвращает { terms: [{ count, sides } | { flat }], modifier }
export function parseFormula(input) {
  if (!input) return null
  const cleaned = input.replace(/\s+/g, '').toLowerCase()
  if (!cleaned) return null

  // Разбиваем на слагаемые с сохранением знаков: "1d6+1d8-2" → ["+1d6", "+1d8", "-2"]
  const parts = cleaned.match(/[+-]?[^+-]+/g)
  if (!parts || parts.length === 0) return null

  const terms = []
  let modifier = 0

  for (const part of parts) {
    const sign = part.startsWith('-') ? -1 : 1
    const body = part.replace(/^[+-]/, '')

    // Проверяем, куб ли это: [N]dM
    const diceMatch = body.match(/^(\d*)d(\d+)$/)
    if (diceMatch) {
      const count = (diceMatch[1] ? parseInt(diceMatch[1], 10) : 1) * sign
      const sides = parseInt(diceMatch[2], 10)
      if (count === 0) continue
      if (Math.abs(count) > 100) return null
      if (sides < 2 || sides > 1000) return null
      terms.push({ count, sides })
      continue
    }

    // Проверяем, число ли это
    const numMatch = body.match(/^\d+$/)
    if (numMatch) {
      modifier += sign * parseInt(body, 10)
      continue
    }

    return null // Не распознали
  }

  if (terms.length === 0 && modifier === 0) return null

  return { terms, modifier }
}

// Бросает кубы по распарсенной формуле
// Возвращает { dice: [...], modifier, total, formula, groups: [...] }
export function rollDice(parsed) {
  const { terms, modifier } = parsed
  const allDice = []
  const groups = [] // для отображения: [{ count, sides, results: [] }]

  for (const term of terms) {
    const { count, sides } = term
    const absCount = Math.abs(count)
    const sign = count >= 0 ? 1 : -1
    const results = []
    for (let i = 0; i < absCount; i++) {
      const v = Math.floor(Math.random() * sides) + 1
      results.push(v * sign)
      allDice.push(v * sign)
    }
    groups.push({ count: absCount, sides, results, sign })
  }

  const diceSum = allDice.reduce((a, b) => a + b, 0)
  const total = diceSum + modifier
  const formula = formatFormula(parsed)

  return { dice: allDice, modifier, total, formula, groups }
}

// Собирает формулу обратно в строку
export function formatFormula(parsed) {
  const { terms, modifier } = parsed
  const parts = []

  for (const t of terms) {
    const sign = t.count >= 0 ? '+' : '-'
    const absCount = Math.abs(t.count)
    const diceStr = `${absCount === 1 ? '' : absCount}d${t.sides}`
    parts.push((parts.length === 0 && sign === '+' ? '' : sign) + diceStr)
  }

  if (modifier !== 0 || parts.length === 0) {
    const sign = modifier >= 0 ? '+' : ''
    parts.push(`${sign}${modifier}`)
  }

  return parts.join('').replace(/^\+/, '')
}

export function roll(formula) {
  const parsed = parseFormula(formula)
  if (!parsed) return null
  return rollDice(parsed)
}