import OpenAI from 'openai'
import { prisma } from '@/lib/db'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' })

export interface MonopolyAnalysis {
  featureName: string
  monopolyScore: number
  moatType: string
  buildPriority: 'now' | 'soon' | 'backlog' | 'ignore'
  whyNow: string
  implementationPlan: string
  pricingRecommendation: string
}

export async function scoreMonopolyFeature(
  productId: string,
  featureName: string,
  description: string
): Promise<MonopolyAnalysis> {
  const product = await prisma.product.findUnique({ where: { id: productId } })

  const prompt = `You are a product moat strategist. Score this feature for Growva's defensibility.

Product: ${product?.name} — ${product?.description}
Feature: ${featureName}
Description: ${description}

Score each dimension 1-10:
1. switchingCost: Does this make users store more data/history inside Growva?
2. dataFlywheel: Does this improve learning from every user/product?
3. habitLoop: Does this make users come back daily/weekly?
4. revenueExpansion: Does this create add-on or upsell potential?
5. competitorGap: Does this attack a clear competitor weakness?
6. saudiAdvantage: Does this use local context competitors don't understand?
7. automationDepth: Does this reduce founder workload directly?

moatType: "data_flywheel" | "switching_cost" | "network_effect" | "saudi_specific" | "automation" | "habit_loop"
buildPriority: "now" if monopolyScore >= 7, "soon" if >= 5, "backlog" if >= 3, else "ignore"

Return ONLY JSON:
{
  "switchingCostScore": 7,
  "dataFlywheelScore": 8,
  "habitLoopScore": 6,
  "revenueExpansionScore": 7,
  "competitorGapScore": 8,
  "saudiAdvantageScore": 9,
  "automationDepthScore": 7,
  "monopolyScore": 7.4,
  "moatType": "saudi_specific",
  "buildPriority": "now",
  "whyNow": "specific reason",
  "implementationPlan": "3 steps",
  "pricingRecommendation": "include in Growth or add-on at $X"
}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const s = JSON.parse(res.choices[0].message.content || '{}')

  // Save to DB
  await prisma.monopolyOpportunity.create({
    data: {
      productId,
      featureName,
      monopolyScore: s.monopolyScore || 5,
      switchingCostScore: s.switchingCostScore || 5,
      dataFlywheelScore: s.dataFlywheelScore || 5,
      habitLoopScore: s.habitLoopScore || 5,
      revenueExpansionScore: s.revenueExpansionScore || 5,
      competitorGapScore: s.competitorGapScore || 5,
      saudiAdvantageScore: s.saudiAdvantageScore || 5,
      automationDepthScore: s.automationDepthScore || 5,
      moatType: s.moatType,
      buildPriority: s.buildPriority || 'backlog',
      whyNow: s.whyNow,
      implementationPlan: s.implementationPlan,
      pricingRecommendation: s.pricingRecommendation,
      status: 'open',
    },
  }).catch(() => {})

  return {
    featureName,
    monopolyScore: s.monopolyScore || 5,
    moatType: s.moatType || 'automation',
    buildPriority: s.buildPriority || 'backlog',
    whyNow: s.whyNow || '',
    implementationPlan: s.implementationPlan || '',
    pricingRecommendation: s.pricingRecommendation || '',
  }
}

export async function getMonopolyScore(productId: string): Promise<number> {
  const opportunities = await prisma.monopolyOpportunity.findMany({
    where: { productId, status: 'open' },
    orderBy: { monopolyScore: 'desc' },
    take: 10,
  })
  if (opportunities.length === 0) return 0
  return Math.round(opportunities.reduce((s, o) => s + o.monopolyScore, 0) / opportunities.length * 10) / 10
}
