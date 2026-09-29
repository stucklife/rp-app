import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export function useGameTime(universeId) {
  const [times, setTimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    if (!universeId) {
      setTimes([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('game_time')
      .select('*')
      .eq('universe_id', universeId)
      .is('deleted_at', null)
      .order('start_x', { ascending: true })

    if (error) {
      console.error('[useGameTime] load error:', error.message)
      setError(error.message)
    } else {
      setTimes(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [universeId])

  // Поиск или создание по координатам
  async function findOrCreate(startX, endX, meta) {
    if (!universeId) return { error: { message: 'Универсум не выбран' } }

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
    setTimes((prev) =>
      [...prev, data].sort((a, b) => Number(a.start_x) - Number(b.start_x))
    )
    return { data }
  }

  return { times, loading, error, findOrCreate, reload: load }
}