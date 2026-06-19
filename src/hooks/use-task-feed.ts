'use client'

import { useState, useCallback, useEffect } from 'react'

export type TaskStatus = 'pending' | 'queued' | 'generating' | 'completed' | 'failed'
export type TaskType = 'video' | 'image_edit' | 'image_gen'

export interface Task {
  id: string
  type: TaskType
  status: TaskStatus
  prompt: string
  resultUrl?: string
  createdAt: number
  elapsed?: number
}

const STORAGE_KEY = 'lc:tasks'

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveTasks(tasks: Task[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.slice(0, 50))) } catch {}
}

export function useTaskFeed() {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => { setTasks(loadTasks()) }, [])

  const add = useCallback((task: Omit<Task, 'createdAt'>) => {
    setTasks((prev) => {
      const next = [{ ...task, createdAt: Date.now() }, ...prev]
      saveTasks(next); return next
    })
  }, [])

  const update = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
      saveTasks(next); return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id)
      saveTasks(next); return next
    })
  }, [])

  const activeCount = tasks.filter((t) => ['pending', 'queued', 'generating'].includes(t.status)).length

  return { tasks, add, update, remove, activeCount }
}
