import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const ACTIVE_KEY = 'rp.activeScene'

// Хук для работы со сценами универсума
export function useScenes(universeId) {
  const [scenes, setScenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    if (!universeId) {
      setScenes([])
      setLoading(false)
      return
    }
    setLoading(true)

    // Сцены + связанные события + локация
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        locations ( id, name ),
        scene_event_links (
          story_events ( id, title )
        )
      `)
      .eq('universe_id', universeId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (error) setError(error.message)
    else setScenes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [universeId])

  // Создание — через RPC-функцию (сцена + событие атомарно)
  async function create(payload) {
    if (!universeId) return { error: { message: 'Универсум не выбран' } }

    const { data, error } = await supabase.rpc('create_scene_with_event', {
      p_universe_id: universeId,
      p_title: payload.title,
      p_description: payload.description || null,
      p_location_id: payload.location_id || null,
      p_time_label: payload.time_label || null,
      p_game_time_id: payload.game_time_id || null,
    })

    if (error) return { error }

    // RPC возвращает [{ scene_id, story_event_id }]
    const created = Array.isArray(data) ? data[0] : data

    // Подгружаем созданную сцену со связями
    const { data: fullScene } = await supabase
      .from('events')
      .select(`
        *,
        locations ( id, name ),
        scene_event_links (
          story_events ( id, title )
        )
      `)
      .eq('id', created.scene_id)
      .single()

    if (fullScene) {
      setScenes((prev) => [fullScene, ...prev])
    }
    return { data: fullScene || { id: created.scene_id } }
  }

  async function update(id, patch) {
    const { data, error } = await supabase
      .from('events')
      .update(patch)
      .eq('id', id)
      .select(`
        *,
        locations ( id, name ),
        scene_event_links (
          story_events ( id, title )
        )
      `)
      .single()

    if (error) return { error }
    setScenes((prev) => prev.map((s) => (s.id === id ? data : s)))
    return { data }
  }

  async function remove(id) {
    const { error } = await supabase
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error }
    setScenes((prev) => prev.filter((s) => s.id !== id))
    return {}
  }

  // Обновить время модификации сцены (вызывается при отправке сообщения)
  async function touch(id) {
    await supabase
      .from('events')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)
    // Пересортировываем список
    setScenes((prev) => {
      const next = [...prev]
      const idx = next.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const [item] = next.splice(idx, 1)
      item.updated_at = new Date().toISOString()
      return [item, ...next]
    })
  }

  return { scenes, loading, error, create, update, remove, touch, reload: load }
}

// Хук активной сцены — хранится в localStorage
export function useActiveScene(universeId, scenes) {
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY))

  // Сохранение в localStorage
  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId)
    else localStorage.removeItem(ACTIVE_KEY)
  }, [activeId])

  // Если активной нет или она из другого универсума — выбрать первую активную
  useEffect(() => {
    if (!scenes || scenes.length === 0) {
      if (activeId) setActiveId(null)
      return
    }
    const exists = scenes.find((s) => s.id === activeId)
    if (exists) return

    // Выбираем первую активную (не archived), если есть, иначе первую вообще
    const firstActive = scenes.find((s) => s.status === 'active') || scenes[0]
    setActiveId(firstActive.id)
  }, [scenes, universeId, activeId])

  const active = scenes?.find((s) => s.id === activeId) || null

  return { activeId, setActiveId, active }
}