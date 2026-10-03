import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const EVENT_SELECT = `
  *,
  game_time:game_time_id ( id, start_x, end_x, start_date_text, start_bc, end_date_text, end_bc ),
  scene_event_links (
    scene:scene_id ( id, title, status )
  )
`

export function useStoryEvents(universeId) {
  const [events, setEvents] = useState([])
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    if (!universeId) {
      setEvents([])
      setLinks([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [eventsRes, linksRes] = await Promise.all([
      supabase
        .from('story_events')
        .select(EVENT_SELECT)
        .eq('universe_id', universeId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false }),
      supabase
        .from('story_event_links')
        .select('*'),
    ])

    if (eventsRes.error) setError(eventsRes.error.message)
    else setEvents(eventsRes.data || [])

    if (!linksRes.error) setLinks(linksRes.data || [])

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [universeId])

  async function create(payload) {
    if (!universeId) return { error: { message: 'Универсум не выбран' } }

    // Находим/создаём game_time (если передано время вручную)
    let gameTimeId = null
    if (payload.start_x !== undefined && payload.start_x !== null) {
      const { data: gt } = await supabase
        .from('game_time')
        .select('*')
        .eq('universe_id', universeId)
        .eq('start_x', payload.start_x)
        .eq('end_x', payload.end_x ?? payload.start_x)
        .is('deleted_at', null)
        .maybeSingle()

      if (gt) {
        gameTimeId = gt.id
      } else {
        const { data: newGt, error: gtErr } = await supabase
          .from('game_time')
          .insert({
            universe_id: universeId,
            start_x: payload.start_x,
            end_x: payload.end_x ?? payload.start_x,
            start_date_text: payload.start_date_text || null,
            start_bc: payload.start_bc || false,
            end_date_text: payload.end_date_text || null,
            end_bc: payload.end_bc || false,
          })
          .select()
          .single()
        if (gtErr) return { error: gtErr }
        gameTimeId = newGt.id
      }
    }

    const { data, error } = await supabase
      .from('story_events')
      .insert({
        universe_id: universeId,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        is_global: payload.is_global || false,
        game_time_id: gameTimeId,
      })
      .select(EVENT_SELECT)
      .single()

    if (error) return { error }
    setEvents((prev) => [data, ...prev])
    return { data }
  }

  async function update(id, patch) {
    // Если меняется время вручную — обновляем game_time
    let gameTimeId = patch.game_time_id
    if (patch.start_x !== undefined && patch.start_x !== null) {
      const { data: gt } = await supabase
        .from('game_time')
        .select('*')
        .eq('universe_id', universeId)
        .eq('start_x', patch.start_x)
        .eq('end_x', patch.end_x ?? patch.start_x)
        .is('deleted_at', null)
        .maybeSingle()

      if (gt) {
        gameTimeId = gt.id
      } else {
        const { data: newGt, error: gtErr } = await supabase
          .from('game_time')
          .insert({
            universe_id: universeId,
            start_x: patch.start_x,
            end_x: patch.end_x ?? patch.start_x,
            start_date_text: patch.start_date_text || null,
            start_bc: patch.start_bc || false,
            end_date_text: patch.end_date_text || null,
            end_bc: patch.end_bc || false,
          })
          .select()
          .single()
        if (gtErr) return { error: gtErr }
        gameTimeId = newGt.id
      }
    }

    const eventPatch = {
      title: patch.title,
      description: patch.description,
      is_global: patch.is_global,
    }
    if (gameTimeId !== undefined) eventPatch.game_time_id = gameTimeId

    const { data, error } = await supabase
      .from('story_events')
      .update(eventPatch)
      .eq('id', id)
      .select(EVENT_SELECT)
      .single()

    if (error) return { error }
    setEvents((prev) => prev.map((e) => (e.id === id ? data : e)))

    // Пересчитываем границы (если изменилось время)
    if (gameTimeId !== undefined) {
      await supabase.rpc('recompute_event_bounds', { p_event_id: id })
      await load()  // перезагрузим для актуальных данных
    }

    return { data }
  }

  async function remove(id) {
    // 1. Находим сцены, привязанные к этому событию
    const { data: linkedScenes, error: linkErr } = await supabase
      .from('scene_event_links')
      .select('scene_id')
      .eq('story_event_id', id)

    if (linkErr) return { error: linkErr }

    // 2. Для каждой сцены проверяем: это событие единственное?
    const scenesNeedingStub = []
    for (const { scene_id } of linkedScenes || []) {
      const { data: others, error: othersErr } = await supabase
        .from('scene_event_links')
        .select('story_event_id')
        .eq('scene_id', scene_id)
        .neq('story_event_id', id)

      if (othersErr) return { error: othersErr }
      if (!others || others.length === 0) {
        scenesNeedingStub.push(scene_id)
      }
    }

    // 3. Для каждой такой сцены — создаём пустышку и линкуем
    for (const sceneId of scenesNeedingStub) {
      const { data: scene } = await supabase
        .from('events')
        .select('title, description, game_time_id')
        .eq('id', sceneId)
        .maybeSingle()

      if (!scene) continue

      const { data: stub, error: stubErr } = await supabase
        .from('story_events')
        .insert({
          universe_id: universeId,
          title: scene.title,
          description: scene.description || null,
          game_time_id: scene.game_time_id || null,
        })
        .select()
        .single()

      if (stubErr) return { error: stubErr }

      await supabase
        .from('scene_event_links')
        .insert({ scene_id: sceneId, story_event_id: stub.id })
    }

    // 4. Только теперь soft-delete оригинала
    const { error } = await supabase
      .from('story_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error }

    setEvents((prev) => prev.filter((e) => e.id !== id))
    await load()
    return {}
  }

  // --- Связи между событиями ---
  async function linkEvents(fromId, toId, relation) {
    const { data, error } = await supabase
      .from('story_event_links')
      .insert({ from_event_id: fromId, to_event_id: toId, relation })
      .select()
      .single()

    if (error) return { error }
    setLinks((prev) => [...prev, data])

    if (relation === 'parent_of') {
      await supabase.rpc('recompute_event_bounds', { p_event_id: fromId })
    }
    return { data }
  }

  async function unlinkEvents(linkId) {
    const link = links.find((l) => l.id === linkId)
    const { error } = await supabase
      .from('story_event_links')
      .delete()
      .eq('id', linkId)

    if (error) return { error }
    setLinks((prev) => prev.filter((l) => l.id !== linkId))
    return {}
  }

  // --- Связи событий и сцен ---
  async function linkScene(storyEventId, sceneId) {
    const { error } = await supabase
      .from('scene_event_links')
      .insert({ story_event_id: storyEventId, scene_id: sceneId })

    if (error) return { error }
    await load()
    return {}
  }

  async function unlinkScene(storyEventId, sceneId) {
    const { data: remaining } = await supabase
      .from('scene_event_links')
      .select('story_event_id')
      .eq('scene_id', sceneId)

    const afterRemoval = (remaining || []).filter(
      (l) => l.story_event_id !== storyEventId
    )

    if (afterRemoval.length === 0) {
      return { error: { message: 'У сцены должно остаться хотя бы одно событие' } }
    }

    const { error } = await supabase
      .from('scene_event_links')
      .delete()
      .eq('story_event_id', storyEventId)
      .eq('scene_id', sceneId)

    if (error) return { error }
    await load()
    return {}
  }

  return {
    events,
    links,
    loading,
    error,
    create,
    update,
    remove,
    linkEvents,
    unlinkEvents,
    linkScene,
    unlinkScene,
    reload: load,
    setEvents,
    setLinks,
  }
}