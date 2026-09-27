import { useState, useMemo } from 'react'
import { parseFormula, rollDice } from '../lib/dice'

const DICE_TYPES = [4, 6, 8, 10, 12, 20]

export default function DiceModal({ open, onClose, onSubmit, characterName }) {
  const [count, setCount] = useState(1)
  const [sides, setSides] = useState(20)
  const [modifier, setModifier] = useState(0)
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [formulaText, setFormulaText] = useState('')
  const [preview, setPreview] = useState(null)

  // Превью формулы
  const currentFormula = useMemo(() => {
    if (formulaText.trim()) return formulaText.trim()
    return `${count}d${sides}${modifier ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`
  }, [count, sides, modifier, formulaText])

  const parsed = useMemo(() => parseFormula(currentFormula), [currentFormula])

  function handlePreview() {
    if (!parsed) return
    setPreview(rollDice(parsed))
  }

  function handleSubmit() {
    if (!parsed) return
    const result = rollDice(parsed)
    onSubmit({
      description: description.trim(),
      difficulty: difficulty ? parseInt(difficulty, 10) : null,
      ...result,
    })
    // Сброс
    setDescription('')
    setDifficulty('')
    setCount(1)
    setSides(20)
    setModifier(0)
    setFormulaText('')
    setPreview(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
      {/* Затемнение */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Модалка */}
      <div className="relative bg-slate-900 border-t sm:border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="sticky top-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-bold flex items-center gap-2">
            🎲 Бросок кубов
            {characterName && (
              <span className="text-xs text-slate-400 font-normal">
                от {characterName}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-slate-800"
          >
            ✕
          </button>
        </header>

        <div className="p-4 space-y-4">
          {/* Тип куба */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Куб</label>
            <div className="grid grid-cols-6 gap-2">
              {DICE_TYPES.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setSides(d)
                    setFormulaText('')
                    setPreview(null)
                  }}
                  className={`py-3 rounded-lg font-bold text-sm transition ${
                    sides === d && !formulaText.trim()
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  d{d}
                </button>
              ))}
            </div>
          </div>

          {/* Количество + модификатор */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Количество</label>
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg">
                <button
                  onClick={() => { setCount(Math.max(1, count - 1)); setPreview(null) }}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  −
                </button>
                <span className="flex-1 text-center font-mono">{count}</span>
                <button
                  onClick={() => { setCount(Math.min(20, count + 1)); setPreview(null) }}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Модификатор</label>
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg">
                <button
                  onClick={() => { setModifier(modifier - 1); setPreview(null) }}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  −
                </button>
                <span className="flex-1 text-center font-mono">
                  {modifier > 0 ? `+${modifier}` : modifier}
                </span>
                <button
                  onClick={() => { setModifier(modifier + 1); setPreview(null) }}
                  className="px-3 py-2 text-slate-400 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Формула вручную */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Формула (можно ввести вручную: 2d6+3)
            </label>
            <input
              value={formulaText}
              onChange={(e) => { setFormulaText(e.target.value); setPreview(null) }}
              placeholder={currentFormula}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-600"
            />
            {!parsed && formulaText.trim() && (
              <div className="text-xs text-red-400 mt-1">Неверная формула</div>
            )}
          </div>

          {/* Описание */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Что проверяем? (опционально)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Проверка скрытности, урон от удара…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
            />
          </div>

          {/* Сложность */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Сложность (опционально)
            </label>
            <input
              type="number"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              placeholder="Например, 15"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
            />
          </div>

          {/* Превью */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Формула</div>
            <div className="font-mono text-sm">{currentFormula || '—'}</div>

            {preview && (
              <div className="mt-2 pt-2 border-t border-slate-700">
                <div className="text-xs text-slate-400 mb-1">Результат</div>
                <div className="font-mono text-sm">
                  [{preview.dice.join(', ')}]
                  {preview.modifier !== 0 && ` ${preview.modifier > 0 ? '+' : ''}${preview.modifier}`}
                  {' = '}
                  <span className="text-blue-400 font-bold">{preview.total}</span>
                </div>
              </div>
            )}
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handlePreview}
              disabled={!parsed}
              className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium"
            >
              🎲 Пробный бросок
            </button>
            <button
              onClick={handleSubmit}
              disabled={!parsed}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2.5 rounded-lg text-sm font-medium"
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}