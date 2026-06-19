import type { ProviderAdapter, SubmitInput, PollResult } from './types'
import { submitVideo, getVideoStatus } from '../siliconflow'

// 硅基适配器 —— 容灾备用（Wan2.2，720p，固定 5s）
// 仅当用户选的是 5s 才降级；10s/15s 拒绝降级 → 退款，不偷偷给短片
export const siliconflowAdapter: ProviderAdapter = {
  async submit({ prompt, images, durationSec }: SubmitInput): Promise<string> {
    if (durationSec > 5) {
      throw new Error('容灾引擎仅支持 5 秒，无法满足所选时长，跳过降级')
    }
    return submitVideo(images[0], prompt)
  },
  async poll(taskId: string): Promise<PollResult> {
    const s = await getVideoStatus(taskId)
    return { status: s.status, videoUrl: s.videoUrl, reason: s.reason }
  },
}
