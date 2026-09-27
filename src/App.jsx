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
import ReferencePanel from './components/ReferencePanel'
import { useMessages } from './lib/messages'
import ToastContainer from './components/ToastContainer'
import { useNotificationSettings } from './lib/notifications'
import { useRealtime } from './lib/realtime'
import { addToast } from './lib/toastStore'

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
    useActiveScene(universeId, scenes, scenesApi.loading)

  const notificationsApi = useNotificationSettings(user)

   const [characterId, setCharacterId] = useState(() => localStorage.getItem(CHAR_KEY) || null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const messagesApi = useMessages(activeSceneId)
  const { messages, loading } = messagesApi

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
 
  useRealtime({
    universeId,
    currentUser: user,
    callbacks: {
            onMessage: (msg) => {
        // Обновляем ленту, если это наша активная сцена
        if (msg.event_id === activeSceneId) {
          messagesApi.applyInsert(msg)
        }

        // Уведомление
        if (!notificationsApi.shouldNotify({ type: 'messages', source: msg.author })) return

        const scene = scenes.find((s) => s.id === msg.event_id)
        const isOtherScene = msg.event_id !== activeSceneId

        addToast({
          type: 'message',
          icon: '💬',
          title: msg.character_name || msg.author,
          preview: isOtherScene && scene
            ? `📖 ${scene.title}: ${msg.content?.slice(0, 60) || ''}`
            : msg.content?.slice(0, 80) || '',
          onAction: () => setActiveSceneId(msg.event_id),
          duration: 8000,
        })
      },

      onMessageUpdate: (msg) => {
        // Редактирование или удаление (soft delete — тоже UPDATE)
        if (msg.deleted_at) {
          messagesApi.applyDelete(msg.id)
        } else {
          messagesApi.applyUpdate(msg)
        }
      },

      onScene: ({ action, row }) => {
        if (action === 'insert') {
          scenesApi.reload()
          if (!notificationsApi.shouldNotify({ type: 'scenes', source: 'user1' })) return
          addToast({
            type: 'scene',
            icon: '📖',
            title: 'Создана новая сцена',
            preview: row.title,
            onAction: () => setActiveSceneId(row.id),
            duration: 8000,
          })
        } else if (action === 'update') {
          scenesApi.reload()
        } else if (action === 'delete') {
          scenesApi.reload()
        }
      },

      onCharacter: () => {
        charactersApi.reload()
        if (!notificationsApi.shouldNotify({ type: 'references' })) return
        // уведомления по персонажам пока не делаем превью — просто reload
      },

      onLocation: () => {
        locationsApi.reload()
      },
    },
  })

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
        character_id: character?.id || null,
        character_name: character?.name || null,
        content: text,
        reply_to_id: replyTo?.id || null,
      })
      .select(`
        *,
        reply_to:reply_to_id ( id, author, character_id, character_name, content, deleted_at )
      `)
      .single()

    if (error) {
      setError(error.message)
    } else if (data) {
      messagesApi.applyInsert(data)
      scenesApi.touch(activeSceneId)
      setReplyTo(null)
    }
    setSending(false)
  }

  async function handleEditMessage(id, patch) {
    const { error } = await messagesApi.editMessage(id, patch)
    if (error) setError(error.message)
  }

  async function handleDeleteMessage(id) {
    if (!confirm('Удалить сообщение?')) return
    const { error } = await messagesApi.deleteMessage(id)
    if (error) setError(error.message)
  }

      function handleQuoteMessage(message) {
    setReplyTo(message)
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
        notificationsApi={notificationsApi}
      />
      <ToastContainer />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-slate-950 border-b border-slate-800 flex-shrink-0">
  {/* Строка 1: кнопка панели + универсум + пользователь */}
  <div className="px-3 py-2 flex justify-between items-center gap-2">
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
    </div>
    <UserSelector current={user} onChange={setUser} />
  </div>

  {/* Строка 2: сцена */}
  <div className="px-3 pb-2 flex items-center gap-1 min-w-0 border-t border-slate-900 pt-1.5">
    <SceneSelector
      scenes={scenes}
      active={activeScene}
      onSelect={setActiveSceneId}
      onNew={() => setPanelOpen(true)}
    />
  </div>
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
              <MessageList
              messages={messages}
              currentUser={user}
              characters={characters}
              loading={loading}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onQuoteMessage={handleQuoteMessage}
            />
          )}
        </main>

        {activeSceneId && (
          <div className="bg-slate-950 border-t border-slate-800">
            <MessageInput
              onSend={handleSend}
              disabled={sending}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              characters={characters}
              characterId={characterId}
              onCharacterChange={setCharacterId}
            />
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