import { useState, useEffect } from 'react'

const KEY = 'rp.currentUser'

export const USERS = [
  { id: 'user1',    label: 'User 1' },
  { id: 'user2',    label: 'User 2' },
  { id: 'narrator', label: 'Narrator' },
]

export function useCurrentUser() {
  const [user, setUser] = useState(() => {
    return localStorage.getItem(KEY) || 'user1'
  })

  useEffect(() => {
    localStorage.setItem(KEY, user)
  }, [user])

  return [user, setUser]
}