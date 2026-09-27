import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useCurrentUser } from './lib/user'
import { useUniverses } from './lib/universes'
import { useCharacters } from './lib/characters'
import { useLocations } from './lib/locations'
import { useScenes, useActiveScene } from './lib/scenes'
import UserSelector from './components/UserSelector'
import UniverseSelector from './components/UniverseSelector'
import SceneSelector from './components/SceneSelector'
import MessageList from './components/MessageList'
import MessageInput from './components/MessageInput'
import CharacterSelector from './components/CharacterSelector'
import ReferencePanel from './components/ReferencePanel'

const CHAR_KEY = 'rp.currentCharacter'

function App() {
  const [user, setUser] = useCurrentUser()
  const universesApi = useUniverses()
  const { currentId: universeId, universes, current: currentUniverse } = universesApi

  const charactersApi = useCharacters(universeId)
  const { characters, create: createCharacter } = charactersApi

  const locationsApi = useLocations(universeId)
  const scenesApi = useScenes(universeId)
  const { scenes } = scenesApi
  const { activeId: activeSceneId, setActiveId: setActiveSceneId, active: activeScene } =
    useActiveScene(universeId, scenes)

  const [characterId, setCharacterId] = useState(() => localStorage.getItem(CHAR_KEY) || null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (characterId) localStorage.setItem(CHAR_KEY, characterId)
    else localStorage.removeItem(CHAR_KEY)
  }, [characterId])

  useEffect(() => {
    if (!characterId) return
    const c = characters.find((x) => x.id === characterId)
    if (!c) return
    if (user !== 'narrator' && c.is_player && c.owner !== user) {
      setCharacterId(null)
    }
  }, [user, characters, characterId])

  // Загрузка сообщений при смене сцены
  useEffect(() => {
    loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSceneId])

  async function loadMessages() {
    if (!activeSceneId) {
      setMessages([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('event_id', activeSceneId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setMessages(data || [])
    setLoading(false)
  }

  async function handleSend(text) {
    if (!activeSceneId) return
    setSending(true)
    setError(null)

    const character = characters.find((c) => c.id === characterId)

    const { data, error } = await supabase
      .from('messages')
      .insert({
        event_id: activeSceneId,
        author: user,
        kind: 'chat',
        character_name: character?.name || null,
        content: text,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else if (data) {
      setMessages((prev) => [...prev, data])
      scenesApi.touch(activeSceneId) // поднять сцену вверх в списке
    }
    setSending(false)
  }

  if (universesApi.loading || scenesApi.loading) {
    return (
      <div className="min-h-dvh bg-slate-900 text-white flex items-center justify-center">
        Загрузка...
      </div>
    )
  }

  if (!universeId) {
    return (
      <div className="min-h-dvh bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">🌌 Создай свой первый мир</h1>
          <p className="text-slate-400 text-sm">
            Универсум — это отдельная вселенная со своими локациями, персонажами и историей.
          </p>
          <CreateFirstUniverse onCreate={universesApi.create} onSelect={universesApi.select} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 text-white flex h-dvh">
      <ReferencePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        charactersApi={charactersApi}
        locationsApi={locationsApi}
        scenesApi={scenesApi}
        activeSceneId={activeSceneId}
        onSelectScene={setActiveSceneId}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-slate-950 border-b border-slate-800 px-3 py-2 flex justify-between items-center flex-shrink-0 gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="text-slate-400 hover:text-white text-lg w-8 h-8 flex items-center justify-center rounded hover:bg-slate-800 flex-shrink-0"
              title="Пространство"
            >
              📚
            </button>
            <UniverseSelector
              universes={universes}
              current={currentUniverse}
              onSelect={universesApi.select}
              onCreate={universesApi.create}
            />
            <SceneSelector
              scenes={scenes}
              active={activeScene}
              onSelect={setActiveSceneId}
              onNew={() => setPanelOpen(true)}
            />
          </div>
          <UserSelector current={user} onChange={setUser} />
        </header>

        {error && (
          <div className="bg-red-900/50 border-b border-red-800 text-red-200 text-sm px-3 py-2 flex-shrink-0">
            {error}
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {!activeSceneId ? (
            <div className="h-full flex items-center justify-center p-6 text-center">
              <div className="max-w-md space-y-3">
                <h2 className="text-xl font-bold">📖 Нет активной сцены</h2>
                <p className="text-slate-400 text-sm">
                  Создай первую сцену, чтобы начать играть. Каждая сцена — это отдельный диалог в конкретной локации.
                </p>
                <button
                  onClick={() => setPanelOpen(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Открыть пространство
                </button>
              </div>
            </div>
          ) : (
            <MessageList messages={messages} currentUser={user} loading={loading} />
          )}
        </main>

        {activeSceneId && (
          <div className="bg-slate-950 border-t border-slate-800">
            <div className="px-2 pt-1">
              <CharacterSelector
                currentUser={user}
                characters={characters}
                value={characterId}
                onChange={setCharacterId}
                onCreate={createCharacter}
              />
            </div>
            <MessageInput onSend={handleSend} disabled={sending} />
          </div>
        )}
      </div>
    </div>
  )
}

function CreateFirstUniverse({ onCreate, onSelect }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function handle() {
    if (!name.trim()) return
    setBusy(true)
    const { data, error } = await onCreate({ name })
    setBusy(false)
    if (error) {
      alert('Ошибка: ' + error.message)
      return
    }
    onSelect(data.id)
  }

  return (
    <div className="space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handle()}
        placeholder="Название мира..."
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-600"
      />
      <button
        onClick={handle}
        disabled={busy || !name.trim()}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium"
      >
        {busy ? 'Создание...' : 'Создать универсум'}
      </button>
    </div>
  )
}

export default App