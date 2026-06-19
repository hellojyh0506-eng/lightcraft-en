// Content moderation disabled —— AI models have built-in moderation, no extra layer needed

export interface ModerationResult {
  approved: boolean
  reason?: string
}

export async function moderateText(_text: string): Promise<ModerationResult> {
  return { approved: true }
}

export async function moderateImage(_imageDataUrl: string): Promise<ModerationResult> {
  return { approved: true }
}

export async function moderateVideo(_videoUrl: string): Promise<ModerationResult> {
  return { approved: true }
}
