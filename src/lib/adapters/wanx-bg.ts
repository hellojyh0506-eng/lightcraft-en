// 通义万相背景生成适配器
// API: wanx-background-generation-v2（DashScope 异步调用）
// 文档: https://help.aliyun.com/zh/model-studio/wanx-background-generation-api-reference
// 定价: ¥0.08/张，500 张免费额度

const BASE = 'https://dashscope.aliyuncs.com/api/v1'

function apiKey(): string {
  const k = process.env.DASHSCOPE_API_KEY
  if (!k) throw new Error('DASHSCOPE_API_KEY 未配置')
  return k
}

export interface BgGenInput {
  /** 前景图片 URL 或 base64 dataURL（须为 RGBA PNG 透明背景） */
  baseImageUrl: string
  /** 背景描述提示词（中英文均可） */
  prompt: string
  /** 反向提示词（不想要的内容） */
  negPrompt?: string
  /** 生成张数 1-4 */
  count?: number
}

export interface BgGenResult {
  status: 'completed' | 'processing' | 'failed'
  imageUrls?: string[]
  reason?: string
}

/** 提交背景生成任务 → 返回 taskId */
export async function submitBgGen(input: BgGenInput): Promise<string> {
  const body = {
    model: 'wanx-background-generation-v2',
    input: {
      base_image_url: input.baseImageUrl,
      ref_prompt: input.prompt,
      ...(input.negPrompt ? { neg_ref_prompt: input.negPrompt } : {}),
    },
    parameters: {
      n: input.count ?? 1,
      model_version: 'v3', // v3 质量更好
    },
  }

  const res = await fetch(`${BASE}/services/aigc/background-generation/generation/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'X-DashScope-Async': 'enable',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({} as Record<string, string>))
    throw new Error(`背景生成提交失败 ${res.status}: ${err.code || ''} ${err.message || ''}`.trim())
  }

  const data = await res.json()
  const taskId = data.output?.task_id
  if (!taskId) throw new Error(data.code || '未返回 task_id')
  return taskId
}

/** 查询背景生成任务状态 */
export async function pollBgGen(taskId: string): Promise<BgGenResult> {
  const res = await fetch(`${BASE}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    if (res.status >= 400 && res.status < 500) {
      const err = await res.json().catch(() => ({} as Record<string, string>))
      return { status: 'failed', reason: `Query failed ${res.status}: ${err.code || ''} ${err.message || ''}`.trim() }
    }
    return { status: 'processing' }
  }

  const data = await res.json()
  const o = data?.output
  if (!o?.task_status) return { status: 'processing' }

  switch (o.task_status) {
    case 'SUCCEEDED': {
      const urls = (o.results as { url: string }[])?.map((r) => r.url).filter(Boolean)
      return { status: 'completed', imageUrls: urls }
    }
    case 'FAILED':
    case 'CANCELED':
    case 'UNKNOWN':
      return { status: 'failed', reason: o.code || o.message || o.task_status }
    default:
      return { status: 'processing' }
  }
}
