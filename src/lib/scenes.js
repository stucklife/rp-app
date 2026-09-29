import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const ACTIVE_KEY = 'rp.activeScene'

// Поиск или создание game_time по координатам
async function findOrCreateGameTime(universeId, startX, endX, meta) {
  const { data: existing } = await supabase
    .from('game_time')
    .select('*')
    .eq('universe_id', universeId)
    .eq('start_x', startX)
    .eq('end_x', endX)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) return { data: existing }

  const { data, error } = await supabase
    .from('game_time')
    .insert({
      universe_id: universeId,
      start_x: startX,
      end_x: endX,
      start_date_text: meta?.start_date_text || null,
      start_bc: meta?.start_bc || false,
      end_date_text: meta?.end_date_text || null,
      end_bc: meta?.end_bc || false,
    })
    .select()
    .single()

  if (error) return { error }
  return { data }
}

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

  // Создание — через RPC-функцию (сцена + событие + game_time атомарно)
  async function create(payload) {
    if (!universeId) return { error: { message: 'Универсум не выбран' } }

    const rpcPayload = {
      p_universe_id: universeId,
      p_title: payload.title,
      p_description: payload.description || null,
      p_location_id: payload.location_id || null,
      p_time_label: payload.time_label || null,
      p_start_x: payload.start_x ?? 0,
      p_end_x: payload.end_x ?? (payload.start_x ?? 0),
      p_start_date_text: payload.start_date_text || null,
      p_start_bc: payload.start_bc || false,
      p_end_date_text: payload.end_date_text || null,
      p_end_bc: payload.end_bc || false,
      p_story_event_ids: payload.storyEventIds || null,
    }
    
    const { data, error } = await supabase.rpc('create_scene_with_event', rpcPayload)

    if (error) return { error }

    const created = Array.isArray(data) ? data[0] : data

    const { data: fullScene } = await supabase
      .from('events')
      .select(`
        *,
        locations ( id, name ),
        scene_event_links (
          story_event:story_events ( id, title )
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
    let game_time_id = patch.game_time_id

    if (patch.start_x !== undefined) {
      const startX = patch.start_x ?? 0
      const endX = patch.end_x ?? startX
      const { data: gt, error: gtErr } = await findOrCreateGameTime(
        universeId,
        startX,
        endX,
        {
          start_date_text: patch.start_date_text,
          start_bc: patch.start_bc,
          end_date_text: patch.end_date_text,
          end_bc: patch.end_bc,
        }
      )
      if (gtErr) return { error: gtErr }
      game_time_id = gt.id
    }

    const eventPatch = {
      title: patch.title,
      description: patch.description,
      location_id: patch.location_id,
      time_label: patch.time_label,
      status: patch.status,
    }
    if (game_time_id !== undefined) {
      eventPatch.game_time_id = game_time_id
    }

    const { data, error } = await supabase
      .from('events')
      .update(eventPatch)
      .eq('id', id)
      .select(`
        *,
        locations ( id, name ),
        scene_event_links (
          story_event:story_events ( id, title )
        )
      `)
      .single()

    if (error) return { error }

    // Обновляем связи со story_events, если переданы
    if (patch.storyEventIds !== undefined) {
      if (patch.storyEventIds === null || patch.storyEventIds.length === 0) {
        // Проверяем, что останется хотя бы одно событие
        const { data: currentLinks } = await supabase
          .from('scene_event_links')
          .select('story_event_id')
          .eq('scene_id', id)

        if (!currentLinks || currentLinks.length === 0) {
          // Создаём пустышку
          const { data: newEvt } = await supabase
            .from('story_events')
            .insert({
              universe_id: universeId,
              title: patch.title,
              description: patch.description || null,
              game_time_id,
            })
            .select()
            .single()

          if (newEvt) {
            await supabase
              .from('scene_event_links')
              .insert({ scene_id: id, story_event_id: newEvt.id })
          }
        } else {
          // Оставляем существующие
        }
      } else {
        // Заменяем весь список связей
        await supabase.from('scene_event_links').delete().eq('scene_id', id)
        for (const evtId of patch.storyEventIds) {
          await supabase
            .from('scene_event_links')
            .insert({ scene_id: id, story_event_id: evtId })
        }
      }
    }

    // Перечитываем сцену
    const { data: fullScene } = await supabase
      .from('events')
      .select(`
        *,
        locations ( id, name ),
        scene_event_links (
          story_event:story_events ( id, title )
        )
      `)
      .eq('id', id)
      .single()

    if (fullScene) {
      setScenes((prev) => prev.map((s) => (s.id === id ? fullScene : s)))
    }
    return { data: fullScene || data }
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

  async function touch(id) {
    await supabase
      .from('events')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)
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
export function useActiveScene(universeId, scenes, scenesLoading) {
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY))

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId)
    else localStorage.removeItem(ACTIVE_KEY)
  }, [activeId])

  useEffect(() => {
    if (scenesLoading) return

    if (!scenes || scenes.length === 0) {
      if (activeId) setActiveId(null)
      return
    }

    const exists = scenes.find((s) => s.id === activeId)
    if (exists) return

    const firstActive = scenes.find((s) => s.status === 'active') || scenes[0]
    setActiveId(firstActive.id)
  }, [scenes, scenesLoading, universeId, activeId])

  const active = scenes?.find((s) => s.id === activeId) || null

  return { activeId, setActiveId, active }
}