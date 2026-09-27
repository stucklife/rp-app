import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export function useLocations(universeId) {
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    if (!universeId) {
      setLocations([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('universe_id', universeId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) setError(error.message)
    else setLocations(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [universeId])

  async function create(payload) {
    if (!universeId) return { error: { message: 'Универсум не выбран' } }
    const { data, error } = await supabase
      .from('locations')
      .insert({
        universe_id: universeId,
        name: payload.name,
        short_desc: payload.short_desc || null,
        long_desc: payload.long_desc || null,
        parent_id: payload.parent_id || null,
      })
      .select()
      .single()

    if (error) return { error }
    setLocations((prev) => [...prev, data])
    return { data }
  }

  async function update(id, patch) {
    const { data, error } = await supabase
      .from('locations')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) return { error }
    setLocations((prev) => prev.map((l) => (l.id === id ? data : l)))
    return { data }
  }

  async function remove(id) {
    const { error } = await supabase
      .from('locations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error }
    setLocations((prev) => prev.filter((l) => l.id !== id))
    return {}
  }

  return { locations, loading, error, create, update, remove, reload: load }
}