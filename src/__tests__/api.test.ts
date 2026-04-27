/**
 * API Route Tests
 * Tests the request/response logic of API handlers
 * using mocked Prisma and AI dependencies
 */

// ─── MOCK SETUP ──────────────────────────────────────────────────────────────

const mockPrisma = {
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  experiment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  event: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  decision: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  winningPattern: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  dailyReport: {
    upsert: jest.fn(),
  },
  dailyBrief: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  productScore: {
    upsert: jest.fn(),
  },
}

jest.mock('@/lib/db', () => ({ prisma: mockPrisma }))

jest.mock('@/lib/ai', () => ({
  generateExperiments: jest.fn(),
  decideExperiment: jest.fn(),
  generateDailyBrief: jest.fn(),
  calculateProductScore: jest.fn(),
  generateDailySummary: jest.fn(),
  generateExecutionAssets: jest.fn(),
}))

jest.mock('@/lib/templates', () => ({
  detectCategory: jest.fn().mockReturnValue('saas_b2b'),
  getTemplatesForProduct: jest.fn().mockReturnValue([]),
  fillTemplate: jest.fn(),
}))

import { NextRequest } from 'next/server'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function makeRequest(method: string, body?: object, headers?: Record<string, string>): NextRequest {
  const url = 'http://localhost:3000/api/test'
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ─── EVENTS API ──────────────────────────────────────────────────────────────

describe('POST /api/events', () => {
  const { POST } = require('@/app/api/events/route')

  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no API key provided', async () => {
    const req = makeRequest('POST', { type: 'PAGE_VIEW' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toMatch(/api key/i)
  })

  it('returns 401 when API key is invalid', async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null)
    const req = makeRequest('POST', { type: 'PAGE_VIEW' }, { 'x-api-key': 'invalid-key' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when event type is missing', async () => {
    const product = { id: 'p1', name: 'Inab', apiKey: 'valid-key' }
    mockPrisma.product.findUnique.mockResolvedValue(product)
    const req = makeRequest('POST', {}, { 'x-api-key': 'valid-key' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates event and returns 201 for valid request', async () => {
    const product = { id: 'p1', name: 'Inab', apiKey: 'valid-key' }
    const event = { id: 'e1', type: 'PAGE_VIEW', productId: 'p1', value: 1 }
    mockPrisma.product.findUnique.mockResolvedValue(product)
    mockPrisma.event.create.mockResolvedValue(event)

    const req = makeRequest('POST', { type: 'PAGE_VIEW' }, { 'x-api-key': 'valid-key' })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.type).toBe('PAGE_VIEW')
  })

  it('accepts PURCHASE event with custom value', async () => {
    const product = { id: 'p1', apiKey: 'valid-key' }
    const event = { id: 'e1', type: 'PURCHASE', value: 49.99 }
    mockPrisma.product.findUnique.mockResolvedValue(product)
    mockPrisma.event.create.mockResolvedValue(event)

    const req = makeRequest('POST', { type: 'PURCHASE', value: 49.99 }, { 'x-api-key': 'valid-key' })
    const res = await POST(req)

    expect(res.status).toBe(201)
    expect(mockPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ value: 49.99 }) })
    )
  })

  it('accepts optional experimentId', async () => {
    const product = { id: 'p1', apiKey: 'valid-key' }
    mockPrisma.product.findUnique.mockResolvedValue(product)
    mockPrisma.event.create.mockResolvedValue({ id: 'e1', type: 'CLICK', experimentId: 'exp1' })

    const req = makeRequest('POST', { type: 'CLICK', experimentId: 'exp1' }, { 'x-api-key': 'valid-key' })
    const res = await POST(req)

    expect(res.status).toBe(201)
    expect(mockPrisma.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ experimentId: 'exp1' }) })
    )
  })
})

// ─── PRODUCTS API ────────────────────────────────────────────────────────────

describe('POST /api/products', () => {
  const { POST } = require('@/app/api/products/route')

  beforeEach(() => jest.clearAllMocks())

  it('returns 400 when required fields are missing', async () => {
    const req = makeRequest('POST', { name: 'Inab' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates product with all required fields', async () => {
    const product = { id: 'p1', name: 'Inab', description: 'SaaS', targetUser: 'Freelancers' }
    mockPrisma.product.create.mockResolvedValue(product)

    const req = makeRequest('POST', {
      name: 'Inab',
      description: 'Appointment scheduling SaaS',
      targetUser: 'Saudi freelancers',
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe('Inab')
  })

  it('accepts optional price and url', async () => {
    const product = { id: 'p1', name: 'Inab', price: 29, url: 'https://inab.sa' }
    mockPrisma.product.create.mockResolvedValue(product)

    const req = makeRequest('POST', {
      name: 'Inab',
      description: 'SaaS',
      targetUser: 'Freelancers',
      price: '29',
      url: 'https://inab.sa',
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ price: 29 }) })
    )
  })
})

describe('GET /api/products', () => {
  const { GET } = require('@/app/api/products/route')

  beforeEach(() => jest.clearAllMocks())

  it('returns list of products', async () => {
    const products = [
      { id: 'p1', name: 'Inab', experiments: [], _count: { events: 0 } },
      { id: 'p2', name: 'Ventra', experiments: [], _count: { events: 5 } },
    ]
    mockPrisma.product.findMany.mockResolvedValue(products)

    const req = makeRequest('GET')
    const res = await GET()

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(2)
  })

  it('returns empty array when no products', async () => {
    mockPrisma.product.findMany.mockResolvedValue([])
    const res = await GET()
    const data = await res.json()
    expect(data).toEqual([])
  })
})

// ─── DECISIONS API ───────────────────────────────────────────────────────────

describe('POST /api/decisions', () => {
  const { POST } = require('@/app/api/decisions/route')
  const { decideExperiment } = require('@/lib/ai')

  beforeEach(() => jest.clearAllMocks())

  it('returns 404 for unknown experiment', async () => {
    mockPrisma.experiment.findUnique.mockResolvedValue(null)
    const req = makeRequest('POST', { experimentId: 'nonexistent' })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('calls decideExperiment with correct data', async () => {
    const experiment = {
      id: 'exp1',
      productId: 'p1',
      type: 'LANDING_PAGE',
      angle: 'Fear-based',
      distributionChannel: 'organic_social',
      events: [],
      product: { name: 'Inab', description: 'SaaS', price: 29, targetUser: 'Freelancers', goal: 'revenue' },
    }

    mockPrisma.experiment.findUnique.mockResolvedValue(experiment)
    mockPrisma.decision.create.mockResolvedValue({ id: 'd1', action: 'CONTINUE', reason: 'Not enough data', confidence: 0.9 })
    decideExperiment.mockResolvedValue({ action: 'CONTINUE', reason: 'Not enough data', confidence: 0.9 })

    const req = makeRequest('POST', { experimentId: 'exp1' })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(decideExperiment).toHaveBeenCalledTimes(1)
  })

  it('updates experiment status to KILLED on KILL decision', async () => {
    const experiment = {
      id: 'exp1', productId: 'p1',
      type: 'LANDING_PAGE', angle: 'test', distributionChannel: 'seo',
      events: Array(150).fill({ type: 'PAGE_VIEW', value: 1 }),
      product: { name: 'X', description: 'Y', price: null, targetUser: 'Z', goal: 'revenue' },
    }

    mockPrisma.experiment.findUnique.mockResolvedValue(experiment)
    mockPrisma.decision.create.mockResolvedValue({ id: 'd1', action: 'KILL' })
    mockPrisma.experiment.update.mockResolvedValue({ status: 'KILLED' })
    decideExperiment.mockResolvedValue({ action: 'KILL', reason: 'Low conversion', confidence: 0.88 })

    const req = makeRequest('POST', { experimentId: 'exp1' })
    await POST(req)

    expect(mockPrisma.experiment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'KILLED' }) })
    )
  })

  it('updates experiment status to SCALED on SCALE decision', async () => {
    const experiment = {
      id: 'exp1', productId: 'p1',
      type: 'OFFER_TEST', angle: 'ROI', distributionChannel: 'paid_ads',
      events: [],
      product: { name: 'X', description: 'Y', price: 49, targetUser: 'Z', goal: 'revenue' },
    }

    mockPrisma.experiment.findUnique.mockResolvedValue(experiment)
    mockPrisma.decision.create.mockResolvedValue({ id: 'd1', action: 'SCALE' })
    mockPrisma.experiment.update.mockResolvedValue({ status: 'SCALED' })
    decideExperiment.mockResolvedValue({ action: 'SCALE', reason: 'High conversion', confidence: 0.92 })

    const req = makeRequest('POST', { experimentId: 'exp1' })
    await POST(req)

    expect(mockPrisma.experiment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SCALED' }) })
    )
  })
})
