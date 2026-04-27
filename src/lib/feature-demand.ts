import OpenAI from 'openai'
import { prisma } from '@/lib/db'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' })

export interface FeatureAnalysis {
  feature: string
  opportunityScore: number
  monopolyScore: number
  buildDecision: 'BUILD_NOW' | 'VALIDATE_FIRST' | 'BACKLOG' | 'IGNORE'
  reasoning: string
  suggestedImplementation: string
  pricingImpact: string
}

// ─── SCORE FORMULA ────────────────────────────────────────────────────────────
function calculateOpportunityScore(scores: {
  urgency: number; wtp: number; competitorGap: number
  frequency: number; revenuePotential: number; complexity: number
}): number {
  return (
    scores.urgency * 0.25 +
    scores.wtp * 0.25 +
    scores.competitorGap * 0.20 +
    scores.frequency * 0.15 +
    scores.revenuePotential * 0.15 -
    scores.complexity * 0.20
  )
}

// ─── ANALYZE FEATURE REQUEST ──────────────────────────────────────────────────
export async function analyzeFeatureRequest(
  productId: string,
  rawTexts: string[],
  source: string = 'user_feedback'
): Promise<FeatureAnalysis[]> {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return []

  const prompt = `You are a product strategist for a Saudi-focused AI growth tool called Growva.
Analyze these user inputs and extract feature requests.

Product: ${product.name} — ${product.description}
Target: ${product.targetUser}

Raw inputs:
${rawTexts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

For each distinct feature request, score it 1-10:
- urgency: how urgent is this for users?
- willingnessToPayScore: would users pay extra for this?
- competitorGapScore: is this poorly served by competitors?
- frequency: how often is this mentioned?
- revenuePotential: revenue expansion potential?
- complexity: build complexity (10 = very complex)?

Monopoly score answers YES/NO to:
- Creates switching cost? Data advantage? Hard to copy? Improves retention?
- Helps users make money faster? Creates daily habit?

Return ONLY JSON:
{
  "features": [{
    "normalizedFeature": "clear feature name",
    "urgencyScore": 7,
    "willingnessToPayScore": 8,
    "competitorGapScore": 6,
    "frequency": 3,
    "revenuePotentialScore": 7,
    "buildComplexityScore": 4,
    "monopolyScore": 7,
    "reasoning": "why this matters",
    "suggestedImplementation": "how to build it simply",
    "pricingImpact": "add-on $X/mo or included in Growth plan"
  }]
}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  })

  const parsed = JSON.parse(res.choices[0].message.content || '{}')
  const features = parsed.features || []
  const results: FeatureAnalysis[] = []

  for (const f of features) {
    const opportunityScore = calculateOpportunityScore({
      urgency: f.urgencyScore,
      wtp: f.willingnessToPayScore,
      competitorGap: f.competitorGapScore,
      frequency: f.frequency,
      revenuePotential: f.revenuePotentialScore,
      complexity: f.buildComplexityScore,
    })

    const buildDecision: FeatureAnalysis['buildDecision'] =
      opportunityScore >= 7 && f.monopolyScore >= 7 ? 'BUILD_NOW'
      : opportunityScore >= 5 ? 'VALIDATE_FIRST'
      : opportunityScore >= 3 ? 'BACKLOG'
      : 'IGNORE'

    // Save to DB
    await prisma.featureRequest.upsert({
      where: {
        id: `${productId}-${f.normalizedFeature.replace(/\s/g, '-').slice(0, 30)}`,
      },
      update: {
        frequency: { increment: f.frequency || 1 },
        opportunityScore,
      },
      create: {
        id: `${productId}-${f.normalizedFeature.replace(/\s/g, '-').slice(0, 30)}`,
        productId,
        source,
        rawText: rawTexts.join(' | ').slice(0, 500),
        normalizedFeature: f.normalizedFeature,
        frequency: f.frequency || 1,
        urgencyScore: f.urgencyScore,
        willingnessToPayScore: f.willingnessToPayScore,
        competitorGapScore: f.competitorGapScore,
        buildComplexityScore: f.buildComplexityScore,
        monopolyScore: f.monopolyScore,
        revenuePotentialScore: f.revenuePotentialScore,
        opportunityScore,
        status: 'scored',
        reasoning: f.reasoning,
        suggestedImplementation: f.suggestedImplementation,
        pricingImpact: f.pricingImpact,
      },
    }).catch(() => {})

    results.push({
      feature: f.normalizedFeature,
      opportunityScore: Math.round(opportunityScore * 10) / 10,
      monopolyScore: f.monopolyScore,
      buildDecision,
      reasoning: f.reasoning,
      suggestedImplementation: f.suggestedImplementation,
      pricingImpact: f.pricingImpact,
    })
  }

  return results
}

// ─── GET TOP FEATURE REQUESTS ─────────────────────────────────────────────────
export async function getTopFeatureRequests(productId?: string, limit = 10) {
  return prisma.featureRequest.findMany({
    where: { ...(productId && { productId }), status: { not: 'rejected' } },
    orderBy: { opportunityScore: 'desc' },
    take: limit,
  })
}
