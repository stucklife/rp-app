import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const KEY = 'rp.currentUniverse'

export function useUniverses() {
  const [universes, setUniverses] = useState([])
  const [currentId, setCurrentId] = useState(() => localStorage.getItem(KEY))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('universes')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setUniverses(data || [])

    // если текущий не задан или его больше нет — выбрать первый
    const ids = (data || []).map((u) => u.id)
    if (!currentId || !ids.includes(currentId)) {
      if (ids.length > 0) {
        setCurrentId(ids[0])
        localStorage.setItem(KEY, ids[0])
      } else {
        setCurrentId(null)
        localStorage.removeItem(KEY)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function select(id) {
    setCurrentId(id)
    if (id) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
  }

  async function create({ name, description }) {
    const { data, error } = await supabase
      .from('universes')
      .insert({ name: name.trim(), description: description?.trim() || null })
      .select()
      .single()

    if (error) return { error }
    setUniverses((prev) => [...prev, data])
    return { data }
  }

  async function update(id, patch) {
    const { data, error } = await supabase
      .from('universes')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) return { error }
    setUniverses((prev) => prev.map((u) => (u.id === id ? data : u)))
    return { data }
  }

  async function remove(id) {
    const { error } = await supabase
      .from('universes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error }
    setUniverses((prev) => prev.filter((u) => u.id !== id))
    return {}
  }

  return {
    universes,
    currentId,
    current: universes.find((u) => u.id === currentId) || null,
    loading,
    error,
    select,
    create,
    update,
    remove,
    reload: load,
  }
}