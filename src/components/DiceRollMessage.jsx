import { AUTHOR_COLORS, AUTHOR_LABELS } from '../lib/constants'

export default function DiceRollMessage({ message, characters }) {

  const { author, character_id, character_name, content, payload, created_at } = message
  const { formula, dice, modifier, total, difficulty, groups } = payload || {}

  const linkedCharacter = characters.find((c) => c.id === character_id)
  const displayName = linkedCharacter?.name || character_name || AUTHOR_LABELS[author] || author

  const success = difficulty != null ? total >= difficulty : null

  return (
    <>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className={`text-xs font-semibold ${AUTHOR_COLORS[author]}`}>
          {displayName}
        </span>
        <span className="text-[10px] text-slate-500">
          {new Date(created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {content && (
        <div className="text-sm text-slate-200 mb-2 italic">{content}</div>
      )}

      <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-2.5 font-mono">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
          <span>🎲</span>
          <span>{formula || '—'}</span>
        </div>

        <div className="text-sm">
          {Array.isArray(groups) && groups.length > 0 ? (
            groups.map((g, gi) => (
              <span key={gi}>
                {gi > 0 && <span className="text-slate-500"> {g.sign > 0 ? '+' : '−'} </span>}
                <span className="text-slate-400">[</span>
                {(g.results || []).map((d, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-slate-500">, </span>}
                    <span className="text-yellow-400">{Math.abs(d)}</span>
                  </span>
                ))}
                <span className="text-slate-400">]</span>
              </span>
            ))
          ) : (
            <>
              <span className="text-slate-400">[</span>
              {Array.isArray(dice) ? dice.map((d, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-slate-500">, </span>}
                  <span className="text-yellow-400">{d}</span>
                </span>
              )) : <span className="text-slate-500">—</span>}
              <span className="text-slate-400">]</span>
            </>
          )}
          {modifier !== 0 && (
            <span className="text-slate-500"> {modifier > 0 ? '+' : ''}{modifier}</span>
          )}
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-slate-700 flex items-baseline gap-2">
          <span className="text-xs text-slate-500">=</span>
          <span className="text-lg font-bold text-blue-400">{total}</span>
          {difficulty != null && (
            <span className={`text-xs ml-auto font-bold ${
              success ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {success ? '✓ УСПЕХ' : '✗ ПРОВАЛ'}
              <span className="text-slate-500 font-normal ml-1">(сложность {difficulty})</span>
            </span>
          )}
        </div>
      </div>
    </>
  )
}