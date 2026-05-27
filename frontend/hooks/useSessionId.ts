"use client"

import { useState, useEffect } from "react"

const SESSION_KEY = "traviia_cart_session"

export function useSessionId() {
  const [sessionId, setSessionId] = useState("")

  useEffect(() => {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID?.() ?? `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(SESSION_KEY, id)
    }
    setSessionId(id)
  }, [])

  return sessionId
}
