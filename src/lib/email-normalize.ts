/**
 * 邮箱归一化 —— 防止同一个人用变体邮箱重复注册刷积分。
 *
 * 规则：
 * - Gmail / Googlemail：去点号 + 去 +后缀 + googlemail→gmail.com
 * - QQ / Foxmail：去 +后缀 + foxmail.com→qq.com
 * - Outlook / Hotmail / Live：去 +后缀（保留点号）
 * - 其余：仅 trim + lowercase
 *
 * 返回值用于注册唯一性校验和登录查询，
 * 原始邮箱仍可用于展示（但本项目直接存归一化版本，Gmail 送达不受影响）。
 */
export function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at === -1) return trimmed // 格式非法，zod 会拦

  let local = trimmed.slice(0, at)
  let domain = trimmed.slice(at + 1)

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Gmail 忽略点号、忽略 +后缀、googlemail 等价 gmail
    local = local.split('+')[0].replace(/\./g, '')
    domain = 'gmail.com'
  } else if (domain === 'foxmail.com') {
    // Foxmail 是 QQ 邮箱别名
    local = local.split('+')[0]
    domain = 'qq.com'
  } else if (domain === 'qq.com') {
    local = local.split('+')[0]
  } else if (
    ['outlook.com', 'hotmail.com', 'live.com', 'live.cn'].includes(domain)
  ) {
    // Outlook 系列忽略 +后缀，保留点号
    local = local.split('+')[0]
  }

  return `${local}@${domain}`
}
