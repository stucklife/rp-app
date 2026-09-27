import { USERS } from '../lib/user'

const COLORS = {
  user1:    'bg-blue-600',
  user2:    'bg-emerald-600',
  narrator: 'bg-purple-600',
}

export default function UserSelector({ current, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400 text-sm hidden sm:inline">Играю за:</span>
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
        {USERS.map((u) => (
          <button
            key={u.id}
            onClick={() => onChange(u.id)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
              current === u.id
                ? `${COLORS[u.id]} text-white`
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>
    </div>
  )
}