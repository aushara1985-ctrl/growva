import OpenAI from 'openai'
import { prisma } from '@/lib/db'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' })

export interface CompetitorGap {
  competitorGap: string
  whyItMatters: string
  suggestedFeature: string
  pricingOpportunity: string
  monopolyAngle: string
}

export async function analyzeCompetitorGaps(
  productId: string,
  competitorData: { name: string; reviews?: string[]; features?: string[]; pricing?: string; weakness?: string }[]
): Promise<CompetitorGap[]> {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return []

  const prompt = `You are a competitive intelligence analyst for Growva — an AI growth operator for founders.

Our product: ${product.name} — ${product.description}
Target: ${product.targetUser}

Competitor data:
${competitorData.map(c => `
Competitor: ${c.name}
Reviews/complaints: ${(c.reviews || []).join('; ')}
Features: ${(c.features || []).join(', ')}
Pricing: ${c.pricing || 'unknown'}
Known weakness: ${c.weakness || 'unknown'}
`).join('\n')}

Identify the top 3 competitor gaps that Growva should attack.
Focus on: what users complain about, what's overpriced, what's missing, what Growva can do better.
Saudi/MENA context matters — local competitors often miss Arabic support, WhatsApp integration, local payment methods.

Return ONLY JSON:
{
  "gaps": [{
    "competitorGap": "what the competitor fails at",
    "whyItMatters": "why this hurts their users",
    "suggestedFeature": "what Growva should build",
    "pricingOpportunity": "how to price it",
    "monopolyAngle": "why this creates defensibility for Growva"
  }]
}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  })

  const parsed = JSON.parse(res.choices[0].message.content || '{}')
  const gaps: CompetitorGap[] = parsed.gaps || []

  // Save to DB
  for (const gap of gaps) {
    await prisma.competitorSignal.create({
      data: {
        productId,
        competitorName: competitorData[0]?.name || 'Unknown',
        signalType: 'complaint',
        summary: gap.competitorGap,
        weakness: gap.whyItMatters,
        opportunity: gap.suggestedFeature,
        monopolyRelevanceScore: 7,
      },
    }).catch(() => {})
  }

  return gaps
}

// ─── SEED KNOWN COMPETITORS ───────────────────────────────────────────────────
export const KNOWN_COMPETITORS = [
  {
    name: 'HubSpot',
    weakness: 'Too complex, expensive, not built for solo founders or MENA market',
    reviews: ['too expensive for small teams', 'overwhelming features', 'no Arabic support', 'US-centric'],
    pricing: '$800+/mo',
  },
  {
    name: 'Mixpanel',
    weakness: 'Data without decisions — tells you what happened, not what to do',
    reviews: ['shows data but no clear action', 'need a data analyst to use it', 'expensive for startups'],
    pricing: '$25-$833/mo',
  },
  {
    name: 'GrowthHackers',
    weakness: 'Community content, not an execution system',
    reviews: ['just articles and community', 'no real product', 'not actionable'],
    pricing: '$0-$99/mo',
  },
  {
    name: 'Notion + Spreadsheets',
    weakness: 'Manual, no AI, no pattern learning',
    reviews: ['too much manual work', 'no automation', 'easy to fall behind'],
    pricing: 'free-$20/mo',
  },
]

export async function getCompetitorSignals(productId?: string, limit = 10) {
  return prisma.competitorSignal.findMany({
    where: productId ? { productId } : {},
    orderBy: { monopolyRelevanceScore: 'desc' },
    take: limit,
  })
}
