import type { Engine } from '../engines'

// 适配器统一接口 —— 把各供应商的同步/异步差异抹平为 submit→poll
export interface SubmitInput {
  engine: Engine
  prompt: string
  images: string[] // i2v: [首帧]; kf2v: [首帧, 尾帧]（dataURL 或 URL）
  durationSec: number
}
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed'
export interface PollResult {
  status: TaskStatus
  videoUrl?: string
  reason?: string
}
export interface ProviderAdapter {
  submit(input: SubmitInput): Promise<string> // 返回 providerTaskId
  poll(taskId: string): Promise<PollResult>
}
