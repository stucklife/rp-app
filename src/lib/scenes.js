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
    game_time:game_time_id ( id, start_x, end_x, start_date_text, start_bc, end_date_text, end_bc ),
    scene_event_links (
      story_event:story_events ( id, title )
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
        game_time:game_time_id ( id, start_x, end_x, start_date_text, start_bc, end_date_text, end_bc ),
        scene_event_links (
          story_event:story_events ( id, title )
        )
      `)
      .eq('id', created.scene_id)
      .single()

    // Не пушим вручную — realtime onScene → reload() и так обновит список.
    // Ручной push может дать дубликат, если realtime сработает параллельно.
    await load()
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
      // 1. Текущие связи из БД
      const { data: currentLinks, error: curErr } = await supabase
        .from('scene_event_links')
        .select('story_event_id')
        .eq('scene_id', id)

      if (curErr) return { error: curErr }

      const currentIds = new Set((currentLinks || []).map((l) => l.story_event_id))

      // 2. Что должно быть (null или [] = ничего; тогда возможно создание пустышки)
      const desiredIds = new Set(
        Array.isArray(patch.storyEventIds) ? patch.storyEventIds : []
      )

      // 3. Считаем разницу
      const toAdd = [...desiredIds].filter((x) => !currentIds.has(x))
      const toRemove = [...currentIds].filter((x) => !desiredIds.has(x))

      // 4. Удаляем только лишние
      if (toRemove.length > 0) {
        const { error: rmErr } = await supabase
          .from('scene_event_links')
          .delete()
          .eq('scene_id', id)
          .in('story_event_id', toRemove)

        if (rmErr) return { error: rmErr }
      }

      // 5. Добавляем только новые
      if (toAdd.length > 0) {
        const rows = toAdd.map((evtId) => ({ scene_id: id, story_event_id: evtId }))
        const { error: addErr } = await supabase
          .from('scene_event_links')
          .insert(rows)

        if (addErr) return { error: addErr }
      }

      // 6. Особый случай: сцена осталась совсем без событий — создаём пустышку
      //    (срабатывает, если desiredIds пуст и toRemove убрал всё)
      if (desiredIds.size === 0 && currentIds.size > 0 && toAdd.length === 0) {
        const { data: newEvt } = await supabase
          .from('story_events')
          .insert({
            universe_id: universeId,
            title: patch.title,
            description: patch.description || null,
            game_time_id: game_time_id ?? null,
          })
          .select()
          .single()

        if (newEvt) {
          await supabase
            .from('scene_event_links')
            .insert({ scene_id: id, story_event_id: newEvt.id })
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
    // 1. Собираем данные сцены до удаления
    const { data: sceneRow, error: sceneErr } = await supabase
      .from('events')
      .select('game_time_id')
      .eq('id', id)
      .maybeSingle()

    if (sceneErr) return { error: sceneErr }

    const { data: linkedEvents, error: linkErr } = await supabase
      .from('scene_event_links')
      .select('story_event_id')
      .eq('scene_id', id)

    if (linkErr) return { error: linkErr }

    const storyEventIds = (linkedEvents || []).map((l) => l.story_event_id)

    // 2. Удаляем связи этой сцены с событиями (жёстко)
    const { error: unlinkErr } = await supabase
      .from('scene_event_links')
      .delete()
      .eq('scene_id', id)

    if (unlinkErr) return { error: unlinkErr }

    // 3. Soft-delete сцены
    const { error } = await supabase
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error }

    // 4. Проверяем каждое связанное событие — если больше не привязано к живым сценам,
    //    soft-delete его
    for (const evtId of storyEventIds) {
      const { data: stillLinked } = await supabase
        .from('scene_event_links')
        .select(`
          scene:scene_id ( id, deleted_at )
        `)
        .eq('story_event_id', evtId)

      const aliveScenes = (stillLinked || [])
        .map((l) => l.scene)
        .filter((s) => s && s.deleted_at === null)

      if (aliveScenes.length === 0) {
        await supabase
          .from('story_events')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', evtId)
      }
    }

    // 5. Проверяем game_time — если больше никем не используется, soft-delete
    if (sceneRow?.game_time_id) {
      const gtId = sceneRow.game_time_id

      const { data: eventsUsing } = await supabase
        .from('events')
        .select('id')
        .eq('game_time_id', gtId)
        .is('deleted_at', null)
        .limit(1)

      const { data: storyUsing } = await supabase
        .from('story_events')
        .select('id')
        .eq('game_time_id', gtId)
        .is('deleted_at', null)
        .limit(1)

      const busyByEvents = eventsUsing && eventsUsing.length > 0
      const busyByStory = storyUsing && storyUsing.length > 0

      if (!busyByEvents && !busyByStory) {
        await supabase
          .from('game_time')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', gtId)
      }
    }

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