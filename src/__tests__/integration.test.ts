/**
 * Integration Tests — Experiment Lifecycle
 * Tests the full flow: create product → start growth → track events → decide → execute
 */

const mockPrisma = {
  product: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  experiment: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  event: { create: jest.fn(), findMany: jest.fn() },
  decision: { create: jest.fn() },
  winningPattern: { findMany: jest.fn() },
}

jest.mock('@/lib/db', () => ({ prisma: mockPrisma }))
jest.mock('@/lib/ai', () => ({
  generateExperiments: jest.fn(),
  decideExperiment: jest.fn(),
  generateExecutionAssets: jest.fn(),
}))
jest.mock('@/lib/templates', () => ({
  detectCategory: jest.fn().mockReturnValue('saas_b2b'),
  getTemplatesForProduct: jest.fn().mockReturnValue([]),
  fillTemplate: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { generateExperiments, decideExperiment, generateExecutionAssets } from '@/lib/ai'

const mockGenerate = generateExperiments as jest.Mock
const mockDecide = decideExperiment as jest.Mock
const mockExecute = generateExecutionAssets as jest.Mock

function req(method: string, body?: object, headers?: Record<string, string>) {
  return new NextRequest('http://localhost:3000/api/test', {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('Full experiment lifecycle', () => {
  beforeEach(() => jest.clearAllMocks())

  it('lifecycle: create product → start growth → track events → decide', async () => {
    const { POST: createProduct } = require('@/app/api/products/route')
    const { POST: startGrowth } = require('@/app/api/products/[id]/route')
    const { POST: trackEvent } = require('@/app/api/events/route')
    const { POST: makeDecision } = require('@/app/api/decisions/route')

    // 1. Create product
    const product = { id: 'p1', name: 'Inab', description: 'SaaS', targetUser: 'Freelancers', isActive: false, apiKey: 'rk_test_123' }
    mockPrisma.product.create.mockResolvedValue(product)

    const createRes = await createProduct(req('POST', { name: 'Inab', description: 'SaaS', targetUser: 'Freelancers' }))
    expect(createRes.status).toBe(201)

    // 2. Start growth mode
    mockPrisma.product.findUnique.mockResolvedValue({ ...product, isActive: false })
    mockPrisma.product.update.mockResolvedValue({ ...product, isActive: true })
    mockPrisma.winningPattern.findMany.mockResolvedValue([])
    mockPrisma.experiment.count.mockResolvedValue(0)
    mockGenerate.mockResolvedValue([{
      type: 'LANDING_PAGE', angle: 'Fear', headline: 'Stop losing deals',
      copy: 'Inab follows up.', cta: 'Start free',
      distributionChannel: 'organic_social', expectedKpi: 'signup_rate',
    }])
    mockPrisma.experiment.create.mockResolvedValue({ id: 'exp1', status: 'ACTIVE', productId: 'p1' })

    const startRes = await startGrowth(req('POST', {}), { params: { id: 'p1' } })
    expect(startRes.status).toBe(200)
    const startData = await startRes.json()
    expect(startData.experiments.length).toBeGreaterThan(0)

    // 3. Track events from product
    mockPrisma.product.findUnique.mockResolvedValue({ ...product, isActive: true })
    mockPrisma.event.create.mockResolvedValue({ id: 'ev1', type: 'PAGE_VIEW', productId: 'p1' })

    const eventRes = await trackEvent(req('POST', { type: 'PAGE_VIEW', experimentId: 'exp1' }, { 'x-api-key': 'rk_test_123' }))
    expect(eventRes.status).toBe(201)

    // 4. Trigger decision
    const experiment = {
      id: 'exp1', productId: 'p1', type: 'LANDING_PAGE',
      angle: 'Fear', distributionChannel: 'organic_social',
      events: Array(50).fill({ type: 'PAGE_VIEW', value: 1 }),
      product: { name: 'Inab', description: 'SaaS', price: null, targetUser: 'Freelancers', goal: 'revenue' },
    }
    mockPrisma.experiment.findUnique.mockResolvedValue(experiment)
    mockPrisma.decision.create.mockResolvedValue({ id: 'd1', action: 'CONTINUE', reason: 'Need more data', confidence: 0.9 })
    mockDecide.mockResolvedValue({ action: 'CONTINUE', reason: 'Need more data', confidence: 0.9 })

    const decisionRes = await makeDecision(req('POST', { experimentId: 'exp1' }))
    expect(decisionRes.status).toBe(200)
  })

  it('lifecycle: scale experiment → generate execution assets', async () => {
    const { POST: makeDecision } = require('@/app/api/decisions/route')
    const { POST: execute } = require('@/app/api/execute/route')

    // Scale the experiment
    const experiment = {
      id: 'exp1', productId: 'p1', type: 'LANDING_PAGE',
      angle: 'Fear', distributionChannel: 'organic_social',
      events: Array(200).fill({ type: 'PAGE_VIEW', value: 1 }).concat(Array(15).fill({ type: 'SIGNUP', value: 1 })),
      product: { name: 'Inab', description: 'SaaS', price: 29, targetUser: 'Freelancers', goal: 'revenue' },
    }
    mockPrisma.experiment.findUnique.mockResolvedValue(experiment)
    mockPrisma.decision.create.mockResolvedValue({ id: 'd1', action: 'SCALE' })
    mockPrisma.experiment.update.mockResolvedValue({ status: 'SCALED' })
    mockDecide.mockResolvedValue({ action: 'SCALE', reason: 'Strong 7.5% conversion', confidence: 0.95 })

    const decisionRes = await makeDecision(req('POST', { experimentId: 'exp1' }))
    expect(decisionRes.status).toBe(200)
    const decision = await decisionRes.json()
    expect(decision.action.action).toBe('SCALE')

    // Generate execution assets for winner
    const assets = {
      landingPage: { headline: 'Stop losing deals', subheadline: 'Inab follows up', bodySection1: 'Problem', bodySection2: 'Solution', cta: 'Start free', socialProof: '200 users', urgencyLine: 'Limited spots', htmlTemplate: '<html></html>' },
      ads: [{ platform: 'Meta', headline: 'H', body: 'B', cta: 'CTA', hook: 'Hook' }],
      hooks: ['Hook 1', 'Hook 2'],
      campaignKit: { emailSubject: 'Subject', emailBody: 'Body', tweetThread: ['T1'], linkedinPost: 'Post', whatsappMessage: 'Msg' },
    }
    mockPrisma.experiment.findUnique.mockResolvedValue({ ...experiment, product: experiment.product })
    mockExecute.mockResolvedValue(assets)

    const executeRes = await execute(req('POST', { experimentId: 'exp1' }))
    expect(executeRes.status).toBe(200)
    const executeData = await executeRes.json()
    expect(executeData.assets.landingPage.headline).toBeTruthy()
    expect(executeData.assets.ads).toHaveLength(1)
    expect(executeData.assets.hooks).toHaveLength(2)
  })
})

describe('Edge cases', () => {
  beforeEach(() => jest.clearAllMocks())

  it('event tracker handles all valid event types', async () => {
    const { POST: trackEvent } = require('@/app/api/events/route')
    const product = { id: 'p1', apiKey: 'test-key' }
    mockPrisma.product.findUnique.mockResolvedValue(product)

    const eventTypes = ['PAGE_VIEW', 'CLICK', 'SIGNUP', 'PURCHASE', 'CHURN']
    for (const type of eventTypes) {
      mockPrisma.event.create.mockResolvedValue({ id: 'ev1', type })
      const res = await trackEvent(req('POST', { type }, { 'x-api-key': 'test-key' }))
      expect(res.status).toBe(201)
    }
  })

  it('execute returns 404 for nonexistent experiment', async () => {
    const { POST: execute } = require('@/app/api/execute/route')
    mockPrisma.experiment.findUnique.mockResolvedValue(null)
    const res = await execute(req('POST', { experimentId: 'bad-id' }))
    expect(res.status).toBe(404)
  })

  it('start growth generates experiments even with no templates match', async () => {
    const { POST: startGrowth } = require('@/app/api/products/[id]/route')
    const { getTemplatesForProduct } = require('@/lib/templates')
    getTemplatesForProduct.mockReturnValue([])

    const product = { id: 'p1', name: 'X', description: 'Y', targetUser: 'Z', price: null, goal: 'revenue', apiKey: 'k', isActive: false }
    mockPrisma.product.findUnique.mockResolvedValue(product)
    mockPrisma.product.update.mockResolvedValue({ ...product, isActive: true })
    mockPrisma.winningPattern.findMany.mockResolvedValue([])
    mockPrisma.experiment.count.mockResolvedValue(0)
    mockGenerate.mockResolvedValue([{ type: 'LANDING_PAGE', angle: 'A', headline: 'H', copy: 'C', cta: 'CTA', distributionChannel: 'seo', expectedKpi: 'signup_rate' }])
    mockPrisma.experiment.create.mockResolvedValue({ id: 'exp1' })

    const res = await startGrowth(req('POST', {}), { params: { id: 'p1' } })
    expect(res.status).toBe(200)
    expect(mockGenerate).toHaveBeenCalled()
  })
})
