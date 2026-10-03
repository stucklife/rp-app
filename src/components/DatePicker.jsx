import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { parseDate, xToDate } from '../lib/dates'

// Вспомогательные константы
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const MONTHS_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
]
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function daysInMonth(year, month) {
  // month 1..12
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// Первый день месяца (0=Вс по JS Date). Приводим к Пн=0.
function firstWeekdayMonday(year, month) {
  const d = new Date(Date.UTC(year, month - 1, 1))
  const js = d.getUTCDay()          // 0=Вс, 1=Пн, ...
  return (js + 6) % 7               // 0=Пн, ..., 6=Вс
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

export default function DatePicker({ value, bc, cursorX, onChange }) {
  const [open, setOpen] = useState(false)
  const [level, setLevel] = useState('days') // 'days' | 'months' | 'years'
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const popupRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false })

  // Парсим текущее значение
  const parsed = useMemo(() => {
    const d = parseDate(value, bc)
    if (d) {
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
      }
    }
    // Значение пустое — берём из курсора
    const { text, bc: cursorBc } = xToDate(cursorX ?? 0)
    if (text) {
      const [, dd, mm, yy] = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{1,6})$/) || []
      if (dd) {
        return { year: Number(yy), month: Number(mm), day: Number(dd) }
      }
    }
    return { year: 2000, month: 1, day: 1 }
  }, [value, bc, cursorX])

  // Локальное состояние отображаемого года/месяца
  const [viewYear, setViewYear] = useState(parsed.year)
  const [viewMonth, setViewMonth] = useState(parsed.month)
  const [yearInput, setYearInput] = useState(String(parsed.year))

  // При открытии — установить текущее представление по значению
  useEffect(() => {
    if (open) {
      setViewYear(parsed.year)
      setViewMonth(parsed.month)
      setYearInput(String(parsed.year))
      setLevel('days')
    }
  }, [open, parsed.year, parsed.month])

  // Закрытие по клику вне
  useEffect(() => {
    if (!open) return
    function onClick(e) {
      const inWrap = wrapRef.current?.contains(e.target)
      const inPopup = popupRef.current?.contains(e.target)
      if (!inWrap && !inPopup) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Расчёт позиции popup'а при открытии и ресайзе/скролле
  useLayoutEffect(() => {
    if (!open) return
    function calc() {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const popupWidth = 280
      const popupHeight = 380 // примерная высота
      const margin = 4

      const spaceBelow = window.innerHeight - rect.bottom
      const openUp = spaceBelow < popupHeight + margin

      // Горизонталь: прижимаем к правому краю, чтобы не вылезать за экран
      let left = rect.right - popupWidth
      if (left < 8) left = 8
      if (left + popupWidth > window.innerWidth - 8) {
        left = window.innerWidth - popupWidth - 8
      }

      const top = openUp
        ? rect.top - popupHeight - margin
        : rect.bottom + margin

      setPos({ top, left, openUp })
    }
    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('scroll', calc, true)
    return () => {
      window.removeEventListener('resize', calc)
      window.removeEventListener('scroll', calc, true)
    }
  }, [open])

  function selectDay(day) {
    const text = `${pad2(day)}.${pad2(viewMonth)}.${viewYear}`
    onChange({ text, bc })
    setOpen(false)
  }

  function selectMonth(m) {
    setViewMonth(m)
    setLevel('days')
  }

  function selectYear(y) {
    setViewYear(y)
    setYearInput(String(y))
    setLevel('months')
  }

  function applyYearInput() {
    const n = Number(yearInput.replace(/\D/g, ''))
    if (n >= 1 && n <= 999999) {
      setViewYear(n)
      setLevel('months')
    }
  }

  function goToCursor() {
    const { text, bc: cursorBc } = xToDate(cursorX ?? 0)
    if (!text) return
    const m = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{1,6})$/)
    if (!m) return
    const [, dd, mm, yy] = m
    const y = Number(yy)
    const mo = Number(mm)
    const day = Number(dd)

    setViewYear(y)
    setViewMonth(mo)
    setYearInput(String(y))

    // Меняем значение поля
    const outText = `${pad2(day)}.${pad2(mo)}.${pad2(y)}`
    onChange({ text: outText, bc: cursorBc || false })

    setLevel('days')
    setOpen(false)
  }

  // Заголовок по уровню
  const headerLabel =
    level === 'days'
      ? `${MONTHS[viewMonth - 1]} ${viewYear}`
      : level === 'months'
        ? String(viewYear)
        : `${Math.floor((viewYear - 1) / 12) * 12 + 1}–${Math.floor((viewYear - 1) / 12) * 12 + 12}`

  // Сдвиг представления
  function shift(delta) {
    if (level === 'days') {
      let m = viewMonth + delta
      let y = viewYear
      while (m < 1) { m += 12; y -= 1 }
      while (m > 12) { m -= 12; y += 1 }
      setViewMonth(m)
      setViewYear(y)
    } else if (level === 'months') {
      setViewYear((y) => Math.max(1, y + delta))
    } else {
      setViewYear((y) => Math.max(1, y + delta * 12))
    }
  }

  // Сетка дней
  const dayGrid = useMemo(() => {
    if (level !== 'days') return []
    const first = firstWeekdayMonday(viewYear, viewMonth)
    const total = daysInMonth(viewYear, viewMonth)
    const cells = []
    for (let i = 0; i < first; i++) cells.push(null)
    for (let d = 1; d <= total; d++) cells.push(d)
    return cells
  }, [level, viewYear, viewMonth])

  // Сетка годов
  const yearGrid = useMemo(() => {
    if (level !== 'years') return []
    const decadeStart = Math.floor((viewYear - 1) / 12) * 12 + 1
    const arr = []
    for (let i = 0; i < 12; i++) arr.push(decadeStart + i)
    return arr
  }, [level, viewYear])

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          value={value || ''}
          onChange={(e) => onChange({ text: e.target.value, bc })}
          placeholder="01.01.2000"
          maxLength={12}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-600"
        />
        <button
          type="button"
          ref={buttonRef}
          onClick={() => setOpen((v) => !v)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-2 rounded-lg text-sm"
          title="Открыть календарь"
        >
          📅
        </button>
      </div>

      {open && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[100] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 w-[280px]"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="text-slate-400 hover:text-white w-7 h-7 flex items-center justify-center"
            >
              ‹
            </button>

            {level === 'years' ? (
              <input
                type="text"
                inputMode="numeric"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyYearInput()}
                onBlur={applyYearInput}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-sm font-mono text-center w-20 focus:outline-none focus:border-slate-600"
              />
            ) : (
              <button
                type="button"
                onClick={() => setLevel(level === 'days' ? 'months' : 'years')}
                className="text-sm text-slate-200 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800"
              >
                {headerLabel}
              </button>
            )}

            <button
              type="button"
              onClick={() => shift(1)}
              className="text-slate-400 hover:text-white w-7 h-7 flex items-center justify-center"
            >
              ›
            </button>
          </div>

          {/* Уровень: дни */}
          {level === 'days' && (
            <>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-[10px] text-slate-500 text-center py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {dayGrid.map((d, i) => {
                  if (d === null) return <div key={`e-${i}`} />
                  const isSelected =
                    parsed.year === viewYear &&
                    parsed.month === viewMonth &&
                    parsed.day === d
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => selectDay(d)}
                      className={`text-xs py-1.5 rounded ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Уровень: месяцы */}
          {level === 'months' && (
            <div className="grid grid-cols-4 gap-1">
              {MONTHS_SHORT.map((m, i) => {
                const isSelected = parsed.year === viewYear && parsed.month === i + 1
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMonth(i + 1)}
                    className={`text-xs py-2 rounded ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          )}

          {/* Уровень: года */}
          {level === 'years' && (
            <div className="grid grid-cols-4 gap-1">
              {yearGrid.map((y) => {
                const isSelected = parsed.year === y
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => selectYear(y)}
                    className={`text-xs py-2 rounded ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          )}

          {/* Низ: автоматически + BC */}
          {/* Низ: автоматически + BC */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
            {cursorX != null ? (
              <button
                type="button"
                onClick={goToCursor}
                className="text-[11px] text-slate-400 hover:text-white"
                title="Перейти к курсору"
              >
                Автоматически
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => onChange({ text: value, bc: !bc })}
              className={`text-[11px] px-2 py-0.5 rounded ${
                bc
                  ? 'bg-amber-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Переключить до н. э."
            >
              {bc ? 'BC' : 'AD'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}