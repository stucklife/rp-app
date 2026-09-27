import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export function useCharacters(universeId) {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    if (!universeId) {
      setCharacters([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('universe_id', universeId)
      .is('deleted_at', null)
      .order('is_important', { ascending: false })
      .order('name', { ascending: true })

    if (error) setError(error.message)
    else setCharacters(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [universeId])

  async function create(payload) {
    if (!universeId) return { error: { message: 'Универсум не выбран' } }
    const { data, error } = await supabase
      .from('characters')
      .insert({
        universe_id: universeId,
        name: payload.name,
        description: payload.description || null,
        is_player: payload.is_player || false,
        is_important: payload.is_important || false,
        owner: payload.owner || null,
        tags: payload.tags || [],
      })
      .select()
      .single()

    if (error) return { error }
    setCharacters((prev) => [...prev, data])
    return { data }
  }

  async function update(id, patch) {
    const { data, error } = await supabase
      .from('characters')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) return { error }
    setCharacters((prev) => prev.map((c) => (c.id === id ? data : c)))
    return { data }
  }

  async function remove(id) {
    const { error } = await supabase
      .from('characters')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error }
    setCharacters((prev) => prev.filter((c) => c.id !== id))
    return {}
  }

  return { characters, loading, error, create, update, remove, reload: load }
}