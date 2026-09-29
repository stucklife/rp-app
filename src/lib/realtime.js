import { useEffect, useRef } from 'react'
import { supabase } from '../supabase'

// Хук подписок на изменения в БД.
// callbacks — объект с опциональными полями:
//   onMessage(payload), onScene(payload), onCharacter(payload), onLocation(payload)
export function useRealtime({ universeId, currentUser, callbacks }) {
  const cbRef = useRef(callbacks)
  useEffect(() => {
    cbRef.current = callbacks
  }, [callbacks])

  useEffect(() => {
    if (!universeId) return

    const channel = supabase
      .channel(`rp:${universeId}`)
      // --- Сообщения ---
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
                    cbRef.current.onMessage?.(payload.new)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          cbRef.current.onMessageUpdate?.(payload.new)
        }
      )
      // --- Сцены (events) ---
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events', filter: `universe_id=eq.${universeId}` },
        (payload) => cbRef.current.onScene?.({ action: 'insert', row: payload.new })
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `universe_id=eq.${universeId}` },
        (payload) => cbRef.current.onScene?.({ action: 'update', row: payload.new, old: payload.old })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'events', filter: `universe_id=eq.${universeId}` },
        (payload) => cbRef.current.onScene?.({ action: 'delete', old: payload.old })
      )
      // --- Персонажи ---
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'characters', filter: `universe_id=eq.${universeId}` },
        (payload) => cbRef.current.onCharacter?.(payload)
      )
      // --- Локации ---
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations', filter: `universe_id=eq.${universeId}` },
        (payload) => cbRef.current.onLocation?.(payload)
      )
      // --- События истории ---
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'story_events', filter: `universe_id=eq.${universeId}` },
        (payload) => cbRef.current.onStoryEvent?.(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'story_event_links' },
        (payload) => cbRef.current.onStoryEvent?.(payload)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scene_event_links' },
        (payload) => cbRef.current.onStoryEvent?.(payload)
      )

    channel.subscribe((status, err) => {
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [universeId, currentUser])
}