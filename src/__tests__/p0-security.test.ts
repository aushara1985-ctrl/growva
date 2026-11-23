/** P0 security: auth/send rate limit + billing/usage session-only */
const mockFindMany = jest.fn().mockResolvedValue([])
jest.mock('@/lib/db', () => ({ prisma: { billingOpportunity: { findMany: (...a: any[]) => mockFindMany(...a) } } }))
jest.mock('@/lib/billing-executor', () => ({ recommendUpsell: jest.fn().mockResolvedValue(['x']) }))
jest.mock('@/lib/auth', () => ({
  createMagicToken: jest.fn(() => 'tok'),
  getUserFromRequest: jest.fn(),
}))

import { rateLimit, _resetRateLimits } from '@/lib/rate-limit'

function mkReq(url: string, body?: any, ip = '1.1.1.1'): any {
  return {
    url,
    json: async () => body,
    headers: { get: (n: string) => (n.toLowerCase() === 'x-forwarded-for' ? ip : null) },
    cookies: { get: () => undefined },
  }
}

describe('rateLimit', () => {
  beforeEach(() => _resetRateLimits())
  it('allows limit then blocks, resets after window', () => {
    for (let i = 0; i < 5; i++) expect(rateLimit('k', 5, 1000, 0).ok).toBe(true)
    expect(rateLimit('k', 5, 1000, 10).ok).toBe(false)
    expect(rateLimit('k', 5, 1000, 1001).ok).toBe(true)
  })
})

describe('POST /api/auth/send', () => {
  beforeEach(() => {
    _resetRateLimits()
    process.env.RESEND_API_KEY = 'k'; process.env.RESEND_FROM_EMAIL = 'a@b.c'
    jest.resetModules()
  })
  it('429 after 5 per email, even from different IPs', async () => {
    jest.doMock('resend', () => ({ Resend: class { emails = { send: async () => ({}) } } }))
    const { POST } = await import('@/app/api/auth/send/route')
    const codes: number[] = []
    for (let i = 0; i < 7; i++) codes.push((await POST(mkReq('http://x', { email: 'a@x.com' }, `9.9.9.${i}`))).status)
    expect(codes.slice(0, 5)).toEqual([200, 200, 200, 200, 200])
    expect(codes.slice(5)).toEqual([429, 429])
  })
  it('429 after 5 per IP across different emails', async () => {
    jest.doMock('resend', () => ({ Resend: class { emails = { send: async () => ({}) } } }))
    const { POST } = await import('@/app/api/auth/send/route')
    const codes: number[] = []
    for (let i = 0; i < 6; i++) codes.push((await POST(mkReq('http://x', { email: `u${i}@x.com` }, '5.5.5.5'))).status)
    expect(codes[5]).toBe(429)
  })
})

describe('GET /api/billing/usage', () => {
  beforeEach(() => { jest.resetModules(); mockFindMany.mockClear() })
  it('401 without session', async () => {
    const { getUserFromRequest } = await import('@/lib/auth')
    ;(getUserFromRequest as jest.Mock).mockReturnValue(null)
    const { GET } = await import('@/app/api/billing/usage/route')
    const res = await GET(mkReq('http://x/api/billing/usage?userId=victim'))
    expect(res.status).toBe(401)
    expect(mockFindMany).not.toHaveBeenCalled()
  })
  it('uses session user and ignores client userId', async () => {
    const { getUserFromRequest } = await import('@/lib/auth')
    ;(getUserFromRequest as jest.Mock).mockReturnValue({ userId: 'me', email: 'm@x.com' })
    const { GET } = await import('@/app/api/billing/usage/route')
    const res = await GET(mkReq('http://x/api/billing/usage?userId=victim'))
    expect(res.status).toBe(200)
    const { recommendUpsell } = await import('@/lib/billing-executor')
    expect(recommendUpsell).toHaveBeenCalledWith('me')
    expect(mockFindMany.mock.calls[0][0].where.userId).toBe('me')
  })
})
