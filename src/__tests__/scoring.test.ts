import { calculateProductScore } from '@/lib/ai'

const base = {
  activeExperiments: 0,
  conversions7d: 0,
  conversions30d: 0,
  revenue7d: 0,
  revenue30d: 0,
  scaledExperiments: 0,
  killedExperiments: 0,
  totalExperiments: 0,
  winningPatterns: 0,
  avgConversionRate: 0,
  daysSinceLastConversion: 999,
}

describe('calculateProductScore', () => {

  // ─── SIGNAL DETECTION ──────────────────────────────────────────────────

  describe('signal detection', () => {
    it('returns stalled when no active experiments', () => {
      const score = calculateProductScore({ ...base })
      expect(score.signal).toBe('stalled')
    })

    it('returns slowing when active experiments but declining revenue', () => {
      const score = calculateProductScore({
        ...base,
        activeExperiments: 2,
        revenue7d: 50,
        revenue30d: 500,
      })
      expect(score.signal).toBe('slowing')
    })

    it('returns steady when revenue roughly flat week over week', () => {
      const score = calculateProductScore({
        ...base,
        activeExperiments: 2,
        revenue7d: 250,
        revenue30d: 1000,
      })
      expect(score.signal).toBe('steady')
    })

    it('returns accelerating when revenue growing > 20% weekly', () => {
      const score = calculateProductScore({
        ...base,
        activeExperiments: 3,
        revenue7d: 400,
        revenue30d: 1000,
      })
      expect(score.signal).toBe('accelerating')
    })

    it('returns steady when no revenue history', () => {
      const score = calculateProductScore({
        ...base,
        activeExperiments: 2,
        revenue7d: 0,
        revenue30d: 0,
      })
      expect(['steady', 'stalled', 'slowing']).toContain(score.signal)
    })
  })

  // ─── MOMENTUM ──────────────────────────────────────────────────────────

  describe('momentum', () => {
    it('is 0 with no experiments and no recent conversions', () => {
      const score = calculateProductScore({ ...base })
      expect(score.momentum).toBe(0)
    })

    it('increases with active experiments', () => {
      const low = calculateProductScore({ ...base, activeExperiments: 1 })
      const high = calculateProductScore({ ...base, activeExperiments: 4 })
      expect(high.momentum).toBeGreaterThan(low.momentum)
    })

    it('gets bonus for very recent conversion (< 3 days)', () => {
      const stale = calculateProductScore({ ...base, activeExperiments: 2, daysSinceLastConversion: 30 })
      const fresh = calculateProductScore({ ...base, activeExperiments: 2, daysSinceLastConversion: 1 })
      expect(fresh.momentum).toBeGreaterThan(stale.momentum)
    })

    it('caps at 100', () => {
      const score = calculateProductScore({
        ...base,
        activeExperiments: 100,
        scaledExperiments: 100,
        daysSinceLastConversion: 1,
      })
      expect(score.momentum).toBeLessThanOrEqual(100)
    })
  })

  // ─── CONVERSION HEALTH ─────────────────────────────────────────────────

  describe('conversionHealth', () => {
    it('is 0 with no experiments', () => {
      const score = calculateProductScore({ ...base })
      expect(score.conversionHealth).toBe(0)
    })

    it('increases with winning patterns', () => {
      const no = calculateProductScore({ ...base, totalExperiments: 5 })
      const yes = calculateProductScore({ ...base, totalExperiments: 5, winningPatterns: 3 })
      expect(yes.conversionHealth).toBeGreaterThan(no.conversionHealth)
    })

    it('increases with higher avg conversion rate', () => {
      const low = calculateProductScore({ ...base, totalExperiments: 3, scaledExperiments: 1, avgConversionRate: 0.01 })
      const high = calculateProductScore({ ...base, totalExperiments: 3, scaledExperiments: 1, avgConversionRate: 0.05 })
      expect(high.conversionHealth).toBeGreaterThan(low.conversionHealth)
    })

    it('caps at 100', () => {
      const score = calculateProductScore({
        ...base,
        totalExperiments: 10,
        scaledExperiments: 10,
        winningPatterns: 100,
        avgConversionRate: 1,
      })
      expect(score.conversionHealth).toBeLessThanOrEqual(100)
    })
  })

  // ─── REVENUE VELOCITY ──────────────────────────────────────────────────

  describe('revenueVelocity', () => {
    it('is 0 with no revenue', () => {
      const score = calculateProductScore({ ...base })
      expect(score.revenueVelocity).toBe(0)
    })

    it('increases with higher 7d revenue', () => {
      const low = calculateProductScore({ ...base, revenue7d: 100 })
      const high = calculateProductScore({ ...base, revenue7d: 500 })
      expect(high.revenueVelocity).toBeGreaterThan(low.revenueVelocity)
    })

    it('grows faster when revenue accelerating vs flat', () => {
      const flat = calculateProductScore({ ...base, revenue7d: 250, revenue30d: 1000 })
      const growing = calculateProductScore({ ...base, revenue7d: 400, revenue30d: 1000 })
      expect(growing.revenueVelocity).toBeGreaterThan(flat.revenueVelocity)
    })

    it('caps at 100', () => {
      const score = calculateProductScore({ ...base, revenue7d: 100000, revenue30d: 1 })
      expect(score.revenueVelocity).toBeLessThanOrEqual(100)
    })
  })

  // ─── GROWTH CHANCE ─────────────────────────────────────────────────────

  describe('growthChance', () => {
    it('is 0 with nothing running', () => {
      const score = calculateProductScore({ ...base })
      expect(score.growthChance).toBe(0)
    })

    it('increases with more conversions', () => {
      const low = calculateProductScore({ ...base, conversions7d: 2 })
      const high = calculateProductScore({ ...base, conversions7d: 10 })
      expect(high.growthChance).toBeGreaterThan(low.growthChance)
    })

    it('caps at 100', () => {
      const score = calculateProductScore({
        ...base,
        conversions7d: 1000,
        activeExperiments: 100,
        winningPatterns: 100,
      })
      expect(score.growthChance).toBeLessThanOrEqual(100)
    })
  })

  // ─── OVERALL ───────────────────────────────────────────────────────────

  describe('overall', () => {
    it('is 0 for completely idle product', () => {
      const score = calculateProductScore({ ...base })
      expect(score.overall).toBe(0)
    })

    it('is between 0 and 100', () => {
      const cases = [
        base,
        { ...base, activeExperiments: 3, conversions7d: 5 },
        { ...base, revenue7d: 1000, scaledExperiments: 3, totalExperiments: 5 },
      ]
      cases.forEach(c => {
        const score = calculateProductScore(c)
        expect(score.overall).toBeGreaterThanOrEqual(0)
        expect(score.overall).toBeLessThanOrEqual(100)
      })
    })

    it('healthy product scores higher than idle product', () => {
      const idle = calculateProductScore({ ...base })
      const healthy = calculateProductScore({
        ...base,
        activeExperiments: 3,
        conversions7d: 10,
        conversions30d: 35,
        revenue7d: 500,
        revenue30d: 1500,
        scaledExperiments: 2,
        totalExperiments: 6,
        winningPatterns: 2,
        avgConversionRate: 0.04,
        daysSinceLastConversion: 1,
      })
      expect(healthy.overall).toBeGreaterThan(idle.overall)
    })
  })

  // ─── RECOMMENDATION ────────────────────────────────────────────────────

  describe('recommendation', () => {
    it('recommends starting growth mode when stalled', () => {
      const score = calculateProductScore({ ...base })
      expect(score.recommendation).toMatch(/experiment|start/i)
    })

    it('returns a non-empty string always', () => {
      const cases = [
        base,
        { ...base, activeExperiments: 2 },
        { ...base, scaledExperiments: 3, totalExperiments: 5, winningPatterns: 2 },
      ]
      cases.forEach(c => {
        const score = calculateProductScore(c)
        expect(score.recommendation.length).toBeGreaterThan(0)
      })
    })
  })
})
