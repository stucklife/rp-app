import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'

const MESSAGE_SELECT = `
  *,
  reply_to:reply_to_id ( id, author, character_id, character_name, content, deleted_at )
`

export function useMessages(sceneId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!sceneId) {
      setMessages([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('event_id', sceneId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setMessages(data || [])
    setLoading(false)
  }, [sceneId])

  useEffect(() => {
    load()
  }, [load])

  async function editMessage(id, patch) {
    const { data, error } = await supabase
      .from('messages')
      .update({
        content: patch.content,
        character_id: patch.character_id || null,
        character_name: patch.character_name || null,
        edited_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(MESSAGE_SELECT)
      .single()

    if (error) return { error }
    setMessages((prev) => prev.map((m) => (m.id === id ? data : m)))
    return { data }
  }

  async function deleteMessage(id) {
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error }
    setMessages((prev) => prev.filter((m) => m.id !== id))
    return {}
  }

  function applyInsert(msg) {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }

  function applyUpdate(msg) {
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)))
  }

  function applyDelete(id) {
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  return {
    messages,
    loading,
    error,
    editMessage,
    deleteMessage,
    applyInsert,
    applyUpdate,
    applyDelete,
    reload: load,
    setMessages,
  }
}