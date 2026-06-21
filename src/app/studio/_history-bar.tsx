'use client'

import { Play, Images } from 'lucide-react'
import type { Task } from '@/hooks/use-task-feed'

interface Props {
  tasks: Task[]
  onSelect: (task: Task) => void
}

export function HistoryBar({ tasks, onSelect }: Props) {
  if (tasks.length === 0) return null

  return (
    <div className="h-20 shrink-0 border-t border-noir-800/60 bg-noir-950/80 px-4 flex items-center gap-2 overflow-x-auto">
      <span className="text-[10px] text-noir-600 shrink-0 pr-2 uppercase tracking-wider">History</span>
      {tasks.map((task) => (
        <button key={task.id} onClick={() => onSelect(task)}
          className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border transition-all hover:border-gold-400/40 ${
            task.status === 'completed' ? 'border-noir-700/40' : 'border-gold-400/20 animate-glow'
          }`}>
          {task.resultUrl ? (
            <div className="relative w-full h-full">
              {task.type === 'video' ? (
                <>
                  <video src={task.resultUrl} className="w-full h-full object-cover" preload="metadata" muted />
                  <Play className="absolute bottom-0.5 right-0.5 w-3 h-3 text-gold-400" />
                </>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={task.resultUrl} alt="" className="w-full h-full object-cover" />
                  {task.altUrls && task.altUrls.length > 1 && (
                    <span className="absolute bottom-0.5 right-0.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-noir-950/70 text-[8px] text-gold-400">
                      <Images className="w-2.5 h-2.5" />{task.altUrls.length}
                    </span>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-noir-800 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border-2 border-gold-400/50 border-t-transparent animate-spin" />
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
