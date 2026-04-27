/**
 * Scheduler Tests
 * Tests the daily growth loop logic with mocked dependencies
 */

const mockPrisma = {
  product: { findMany: jest.fn() },
  experiment: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  event: {
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    findFirst: jest.fn(),
  },
  decision: { create: jest.fn() },
  winningPattern: {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  dailyReport: { upsert: jest.fn() },
  dailyBrief: { upsert: jest.fn() },
  productScore: { upsert: jest.fn() },
}

jest.mock('@/lib/db', () => ({ prisma: mockPrisma }))

jest.mock('@/lib/ai', () => ({
  decideExperiment: jest.fn(),
  generateExperiments: jest.fn(),
  generateDailyBrief: jest.fn(),
  generateDailySummary: jest.fn(),
  calculateProductScore: jest.fn().mockReturnValue({
    momentum: 50, conversionHealth: 40, revenueVelocity: 30, growthChance: 60,
    overall: 45, signal: 'steady', recommendation: 'Keep running',
  }),
}))

import { runDailyGrowthLoop } from '@/lib/scheduler'
import { decideExperiment, generateExperiments, generateDailyBrief, generateDailySummary } from '@/lib/ai'

const mockDecide = decideExperiment as jest.Mock
const mockGenerate = generateExperiments as jest.Mock
const mockBrief = generateDailyBrief as jest.Mock
const mockSummary = generateDailySummary as jest.Mock

function makeProduct(overrides = {}) {
  return {
    id: 'p1',
    name: 'Inab',
    description: 'SaaS',
    price: 29,
    targetUser: 'Freelancers',
    goal: 'revenue',
    experiments: [],
    winningPatterns: [],
    ...overrides,
  }
}

function makeExperiment(overrides = {}) {
  return {
    id: 'exp1',
    productId: 'p1',
    type: 'LANDING_PAGE',
    angle: 'Fear-based',
    headline: 'Stop losing deals',
    copy: 'Inab follows up for you.',
    cta: 'Start free',
    distributionChannel: 'organic_social',
    expectedKpi: 'signup_rate',
    status: 'ACTIVE',
    ...overrides,
  }
}

describe('runDailyGrowthLoop', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.event.findMany.mockResolvedValue([])
    mockPrisma.event.count.mockResolvedValue(0)
    mockPrisma.event.aggregate.mockResolvedValue({ _sum: { value: 0 } })
    mockPrisma.event.findFirst.mockResolvedValue(null)
    mockPrisma.experiment.findMany.mockResolvedValue([])
    mockPrisma.experiment.count.mockResolvedValue(0)
    mockPrisma.experiment.create.mockResolvedValue({ id: 'new-exp' })
    mockPrisma.experiment.update.mockResolvedValue({})
    mockPrisma.decision.create.mockResolvedValue({ id: 'd1' })
    mockPrisma.winningPattern.create.mockResolvedValue({})
    mockPrisma.winningPattern.count.mockResolvedValue(0)
    mockPrisma.winningPattern.findMany.mockResolvedValue([])
    mockPrisma.dailyReport.upsert.mockResolvedValue({})
    mockPrisma.dailyBrief.upsert.mockResolvedValue({})
    mockPrisma.productScore.upsert.mockResolvedValue({})
    mockSummary.mockResolvedValue('Good day.')
    mockBrief.mockResolvedValue({ content: 'Brief', topFocus: 'Focus on Inab', actions: [] })
  })

  it('does nothing when no active products', async () => {
    mockPrisma.product.findMany.mockResolvedValue([])
    await runDailyGrowthLoop()
    expect(mockDecide).not.toHaveBeenCalled()
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('generates experiments when product has none active', async () => {
    const product = makeProduct({ experiments: [] })
    mockPrisma.product.findMany.mockResolvedValue([product])
    mockGenerate.mockResolvedValue([
      { type: 'LANDING_PAGE', angle: 'Pain', headline: 'H', copy: 'C', cta: 'CTA', distributionChannel: 'organic_social', expectedKpi: 'signup_rate' },
    ])

    await runDailyGrowthLoop()

    expect(mockGenerate).toHaveBeenCalledTimes(1)
    expect(mockPrisma.experiment.create).toHaveBeenCalled()
  })

  it('calls decideExperiment for each active experiment', async () => {
    const exp = makeExperiment()
    const product = makeProduct({ experiments: [exp] })
    mockPrisma.product.findMany.mockResolvedValue([product])
    mockDecide.mockResolvedValue({ action: 'CONTINUE', reason: 'Need more data', confidence: 0.9 })

    await runDailyGrowthLoop()

    expect(mockDecide).toHaveBeenCalledTimes(1)
    expect(mockPrisma.decision.create).toHaveBeenCalledTimes(1)
  })

  it('kills experiment on KILL decision', async () => {
    const exp = makeExperiment()
    const product = makeProduct({ experiments: [exp] })
    mockPrisma.product.findMany.mockResolvedValue([product])
    mockDecide.mockResolvedValue({ action: 'KILL', reason: 'Too low', confidence: 0.88 })

    await runDailyGrowthLoop()

    expect(mockPrisma.experiment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'KILLED' }) })
    )
  })

  it('scales experiment and saves winning pattern on SCALE decision', async () => {
    const exp = makeExperiment()
    const product = makeProduct({ experiments: [exp] })
    mockPrisma.product.findMany.mockResolvedValue([product])
    mockPrisma.event.findMany.mockResolvedValue(
      Array(50).fill({ type: 'PAGE_VIEW', value: 1 }).concat(
        Array(5).fill({ type: 'SIGNUP', value: 1 })
      )
    )
    mockDecide.mockResolvedValue({ action: 'SCALE', reason: 'Strong conversion', confidence: 0.92 })

    await runDailyGrowthLoop()

    expect(mockPrisma.experiment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SCALED' }) })
    )
    expect(mockPrisma.winningPattern.create).toHaveBeenCalledTimes(1)
  })

  it('creates new iteration on ITERATE decision', async () => {
    const exp = makeExperiment()
    const product = makeProduct({ experiments: [exp] })
    mockPrisma.product.findMany.mockResolvedValue([product])
    mockDecide.mockResolvedValue({
      action: 'ITERATE',
      reason: 'Moderate performance',
      confidence: 0.75,
      nextExperiment: { angle: 'New angle', headline: 'New headline' },
    })

    await runDailyGrowthLoop()

    expect(mockPrisma.experiment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
    )
    expect(mockPrisma.experiment.create).toHaveBeenCalled()
  })

  it('generates daily brief after processing all products', async () => {
    const product = makeProduct({ experiments: [] })
    mockPrisma.product.findMany.mockResolvedValue([product])
    mockGenerate.mockResolvedValue([])

    await runDailyGrowthLoop()

    expect(mockBrief).toHaveBeenCalledTimes(1)
    expect(mockPrisma.dailyBrief.upsert).toHaveBeenCalledTimes(1)
  })

  it('saves daily report for each product', async () => {
    const product = makeProduct({ experiments: [] })
    mockPrisma.product.findMany.mockResolvedValue([product])
    mockGenerate.mockResolvedValue([])

    await runDailyGrowthLoop()

    expect(mockPrisma.dailyReport.upsert).toHaveBeenCalledTimes(1)
  })

  it('handles multiple products independently', async () => {
    const p1 = makeProduct({ id: 'p1', name: 'Inab', experiments: [] })
    const p2 = makeProduct({ id: 'p2', name: 'Ventra', experiments: [makeExperiment({ id: 'exp2', productId: 'p2' })] })
    mockPrisma.product.findMany.mockResolvedValue([p1, p2])
    mockGenerate.mockResolvedValue([])
    mockDecide.mockResolvedValue({ action: 'CONTINUE', reason: 'Need data', confidence: 0.9 })

    await runDailyGrowthLoop()

    expect(mockPrisma.dailyReport.upsert).toHaveBeenCalledTimes(2)
  })

  it('does not crash when AI brief generation fails', async () => {
    const product = makeProduct()
    mockPrisma.product.findMany.mockResolvedValue([product])
    mockGenerate.mockResolvedValue([])
    mockBrief.mockRejectedValue(new Error('OpenAI timeout'))

    await expect(runDailyGrowthLoop()).resolves.not.toThrow()
  })

  it('saves product score after processing', async () => {
    const product = makeProduct({ experiments: [] })
    mockPrisma.product.findMany.mockResolvedValue([product])
    mockGenerate.mockResolvedValue([])

    await runDailyGrowthLoop()

    expect(mockPrisma.productScore.upsert).toHaveBeenCalledTimes(1)
  })
})
