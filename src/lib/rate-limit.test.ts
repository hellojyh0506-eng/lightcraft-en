import { describe, it, expect } from 'vitest'
import { createRateLimiter } from './rate-limit'

describe('createRateLimiter', () => {
  it('允许窗口内的请求', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxHits: 3 })
    expect(limiter.check('user1')).toBe(false)
    expect(limiter.check('user1')).toBe(false)
    expect(limiter.check('user1')).toBe(false)
  })

  it('超过上限后拒绝', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxHits: 2 })
    limiter.check('user1')
    limiter.check('user1')
    expect(limiter.check('user1')).toBe(true)
  })

  it('不同 key 互不影响', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxHits: 1 })
    limiter.check('user1')
    expect(limiter.check('user2')).toBe(false)
  })

  it('remaining 返回剩余次数', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxHits: 5 })
    limiter.check('a')
    limiter.check('a')
    expect(limiter.remaining('a')).toBe(3)
  })
})
