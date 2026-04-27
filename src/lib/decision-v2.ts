import OpenAI from 'openai'
import { prisma } from '@/lib/db'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' })

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface DecisionV2Result {
  decision: 'BUILD_NOW' | 'WAIT' | 'REJECT'
  confidence: number
  focusScore: number
  oneLine: string
  reasoning: { demand: string; revenue: string; monopoly: string; risk: string }
  impact: { revenueUplift: string; retentionImpact: string; timeToImpact: string }
  execution: { complexity: 'low'|'medium'|'high'; estimatedTime: string; filesTouched: string[] }
  downsideIfIgnored: string
  buildTicketPreview: object
}

// ─── FOCUS SCORE ──────────────────────────────────────────────────────────────

export function calculateFocusScore(f: {
  monopolyScore: number; revenuePotentialScore: number; urgencyScore: number
  frequency: number; buildComplexityScore: number; predictiveConfidence?: number
}): number {
  return Math.max(0, Math.min(100,
    (f.monopolyScore * 0.30) +
    (f.revenuePotentialScore * 0.25) +
    (f.urgencyScore * 0.20) +
    (Math.min(f.frequency, 10) * 1.5) +
    ((f.predictiveConfidence || 50) * 0.10 / 10) -
    (f.buildComplexityScore * 0.20)
  ))
}

// ─── HARD DECISION RULES ──────────────────────────────────────────────────────

function applyHardRules(focusScore: number, monopolyScore: number, revenuePotentialScore: number): 'BUILD_NOW'|'WAIT'|'REJECT' {
  if (monopolyScore < 30 || revenuePotentialScore < 3) return 'REJECT'
  if (focusScore >= 75 && monopolyScore >= 60 && revenuePotentialScore >= 6) return 'BUILD_NOW'
  if (focusScore >= 50) return 'WAIT'
  return 'REJECT'
}

// ─── MAIN EVALUATION ──────────────────────────────────────────────────────────

export async function evaluateFeatureDecision(featureRequestId: string): Promise<DecisionV2Result> {
  const feature = await prisma.featureRequest.findUnique({ where: { id: featureRequestId } })
  if (!feature) throw new Error('FeatureRequest not found')

  const [product, predictiveModels, brainMemory, winningPatterns, marketContext, competitors] = await Promise.all([
    prisma.product.findUnique({ where: { id: feature.productId } }),
    prisma.predictiveModel.findMany({ where: { sampleSize: { gte: 3 } }, orderBy: { winRate: 'desc' }, take: 3 }),
    prisma.brainMemory.findUnique({ where: { productId: feature.productId } }),
    prisma.winningPattern.findMany({ where: { productId: feature.productId }, orderBy: { conversionRate: 'desc' }, take: 3 }),
    prisma.marketContext.findMany({ where: { active: true }, take: 3 }),
    prisma.competitorSignal.findMany({ where: { productId: feature.productId }, take: 3 }),
  ])

  const focusScore = calculateFocusScore({
    monopolyScore: feature.monopolyScore,
    revenuePotentialScore: feature.revenuePotentialScore,
    urgencyScore: feature.urgencyScore,
    frequency: feature.frequency,
    buildComplexityScore: feature.buildComplexityScore,
    predictiveConfidence: predictiveModels[0]?.confidenceScore ? predictiveModels[0].confidenceScore * 100 : 50,
  })

  const hardDecision = applyHardRules(focusScore, feature.monopolyScore, feature.revenuePotentialScore)

  const prompt = `You are a ruthless CEO decision engine.
Your job is not to suggest. Your job is to decide what should be built, delayed, or killed.
You optimize for: revenue, retention, monopoly advantage.
You ignore: vanity features, cosmetic improvements, low impact ideas.
Be direct, aggressive, and clear.

Product: ${product?.name} — ${product?.description}
Target: ${product?.targetUser}

Feature Request: "${feature.normalizedFeature}"
Source: ${feature.source}
Frequency: mentioned ${feature.frequency} times
Urgency: ${feature.urgencyScore}/10
WTP: ${feature.willingnessToPayScore}/10
Competitor Gap: ${feature.competitorGapScore}/10
Monopoly Score: ${feature.monopolyScore}/10
Revenue Potential: ${feature.revenuePotentialScore}/10
Build Complexity: ${feature.buildComplexityScore}/10
Focus Score (calculated): ${focusScore.toFixed(1)}/100
Hard Rule Decision: ${hardDecision}

Brain Memory: ${JSON.stringify((brainMemory?.learnings as any) || {}).slice(0, 200)}
Winning Patterns: ${winningPatterns.map(w => `${w.angle} (${(w.conversionRate*100).toFixed(1)}% conv)`).join(', ')}
Market: ${marketContext.map(m => m.insight).join('; ').slice(0, 200)}
Competitor signals: ${competitors.map(c => c.summary).join('; ').slice(0, 200)}

Generate a CEO-level decision. The hard rule says ${hardDecision} — you can adjust confidence but respect the logic.

Return ONLY valid JSON:
{
  "decision": "BUILD_NOW|WAIT|REJECT",
  "confidence": 82,
  "oneLine": "Build this to unlock +$1.2k MRR in 14 days",
  "reasoning": {
    "demand": "specific demand insight",
    "revenue": "specific revenue argument",
    "monopoly": "why this creates/doesn't create moat",
    "risk": "main risk"
  },
  "impact": {
    "revenueUplift": "+$800-1,200 MRR",
    "retentionImpact": "+12% D7 retention",
    "timeToImpact": "14 days after launch"
  },
  "execution": {
    "complexity": "low|medium|high",
    "estimatedTime": "2-3 days",
    "filesTouched": ["src/lib/brain.ts", "src/app/api/decisions/route.ts"]
  },
  "downsideIfIgnored": "Competitors can capture this gap in 30 days",
  "buildTicketPreview": {
    "title": "Feature: [name]",
    "description": "What to build and why",
    "acceptanceCriteria": "3 bullet points",
    "priority": "high|medium|low"
  }
}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const ai = JSON.parse(res.choices[0].message.content || '{}')

  // Save to DB
  await prisma.featureDecision.upsert({
    where: { featureRequestId },
    update: {
      decision: ai.decision || hardDecision,
      confidence: ai.confidence || 50,
      focusScore,
      oneLine: ai.oneLine || '',
      demandReasoning: ai.reasoning?.demand || '',
      revenueReasoning: ai.reasoning?.revenue || '',
      monopolyReasoning: ai.reasoning?.monopoly || '',
      riskReasoning: ai.reasoning?.risk || '',
      revenueUplift: ai.impact?.revenueUplift,
      retentionImpact: ai.impact?.retentionImpact,
      timeToImpact: ai.impact?.timeToImpact,
      complexity: ai.execution?.complexity || 'medium',
      estimatedTime: ai.execution?.estimatedTime,
      filesTouched: ai.execution?.filesTouched || [],
      downsideIfIgnored: ai.downsideIfIgnored || '',
      buildTicketPreview: ai.buildTicketPreview || {},
    },
    create: {
      featureRequestId,
      decision: ai.decision || hardDecision,
      confidence: ai.confidence || 50,
      focusScore,
      oneLine: ai.oneLine || '',
      demandReasoning: ai.reasoning?.demand || '',
      revenueReasoning: ai.reasoning?.revenue || '',
      monopolyReasoning: ai.reasoning?.monopoly || '',
      riskReasoning: ai.reasoning?.risk || '',
      revenueUplift: ai.impact?.revenueUplift,
      retentionImpact: ai.impact?.retentionImpact,
      timeToImpact: ai.impact?.timeToImpact,
      complexity: ai.execution?.complexity || 'medium',
      estimatedTime: ai.execution?.estimatedTime,
      filesTouched: ai.execution?.filesTouched || [],
      downsideIfIgnored: ai.downsideIfIgnored || '',
      buildTicketPreview: ai.buildTicketPreview || {},
    },
  })

  // Update feature status
  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: { status: 'scored' },
  }).catch(() => {})

  return {
    decision: ai.decision || hardDecision,
    confidence: ai.confidence || 50,
    focusScore,
    oneLine: ai.oneLine || '',
    reasoning: ai.reasoning || { demand: '', revenue: '', monopoly: '', risk: '' },
    impact: ai.impact || { revenueUplift: '', retentionImpact: '', timeToImpact: '' },
    execution: ai.execution || { complexity: 'medium', estimatedTime: '', filesTouched: [] },
    downsideIfIgnored: ai.downsideIfIgnored || '',
    buildTicketPreview: ai.buildTicketPreview || {},
  }
}

// ─── GET TOP 3 THIS WEEK ──────────────────────────────────────────────────────

export async function getTopDecisions(productId?: string, limit = 10) {
  return prisma.featureDecision.findMany({
    where: {
      decision: { in: ['BUILD_NOW', 'WAIT'] },
      founderAction: null,
      ...(productId && { featureRequest: { productId } }),
    },
    include: { featureRequest: true },
    orderBy: { focusScore: 'desc' },
    take: limit,
  })
}

// ─── FOUNDER ACTION ───────────────────────────────────────────────────────────

export async function applyFounderAction(
  featureDecisionId: string,
  action: 'BUILD_NOW' | 'WAIT' | 'REJECT'
): Promise<BuildTicketResult | null> {
  await prisma.featureDecision.update({
    where: { id: featureDecisionId },
    data: { founderAction: action, founderActionAt: new Date() },
  })

  if (action === 'BUILD_NOW') {
    return createBuildTicket(featureDecisionId)
  }

  if (action === 'WAIT') {
    await prisma.featureDecision.update({
      where: { id: featureDecisionId },
      data: {},
    })
    // Schedule recheck via BuildTicket with WAIT status
    const decision = await prisma.featureDecision.findUnique({
      where: { id: featureDecisionId },
      include: { featureRequest: true },
    })
    if (decision) {
      await prisma.buildTicket.create({
        data: {
          featureDecisionId,
          productId: decision.featureRequest.productId,
          title: `[WAIT] ${decision.featureRequest.normalizedFeature}`,
          description: decision.buildTicketPreview ? JSON.stringify(decision.buildTicketPreview) : '',
          acceptanceCriteria: 'Re-evaluate in 7 days',
          complexity: decision.complexity,
          priority: 'low',
          status: 'queued',
          scheduledRecheckAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }).catch(() => {})
    }
    return null
  }

  if (action === 'REJECT') {
    await prisma.featureRequest.update({
      where: { id: (await prisma.featureDecision.findUnique({ where: { id: featureDecisionId } }))?.featureRequestId || '' },
      data: { status: 'rejected' },
    }).catch(() => {})
    return null
  }

  return null
}

interface BuildTicketResult {
  ticketId: string
  githubIssueUrl?: string
}

async function createBuildTicket(featureDecisionId: string): Promise<BuildTicketResult> {
  const decision = await prisma.featureDecision.findUnique({
    where: { id: featureDecisionId },
    include: { featureRequest: true },
  })
  if (!decision) throw new Error('Decision not found')

  const preview = decision.buildTicketPreview as any || {}

  const ticket = await prisma.buildTicket.create({
    data: {
      featureDecisionId,
      productId: decision.featureRequest.productId,
      title: preview.title || `Build: ${decision.featureRequest.normalizedFeature}`,
      description: preview.description || decision.oneLine,
      acceptanceCriteria: preview.acceptanceCriteria || 'See decision card',
      filesTouched: decision.filesTouched,
      complexity: decision.complexity,
      priority: decision.focusScore >= 80 ? 'high' : decision.focusScore >= 60 ? 'medium' : 'low',
      riskLevel: decision.complexity === 'high' ? 'risky' : 'safe',
      status: 'queued',
    },
  })

  // Try to create GitHub issue
  const githubResult = await createGitHubIssue(ticket).catch(() => null)
  if (githubResult) {
    await prisma.buildTicket.update({
      where: { id: ticket.id },
      data: {
        githubIssueNumber: githubResult.number,
        githubIssueUrl: githubResult.url,
        status: 'sent_to_github',
      },
    })
    return { ticketId: ticket.id, githubIssueUrl: githubResult.url }
  }

  return { ticketId: ticket.id }
}

// ─── GITHUB ISSUE CREATION ────────────────────────────────────────────────────

async function createGitHubIssue(ticket: any): Promise<{ number: number; url: string } | null> {
  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_REPO_OWNER || 'aushara1985-ctrl'
  const repo = process.env.GITHUB_REPO_NAME || 'growva'

  if (!token) return null

  const body = `## 🔥 Growva Build Ticket

**Decision:** BUILD_NOW
**Focus Score:** ${ticket.complexity}
**Priority:** ${ticket.priority}
**Risk:** ${ticket.riskLevel}

### What to build
${ticket.description}

### Acceptance Criteria
${ticket.acceptanceCriteria}

### Files to touch
${(ticket.filesTouched || []).map((f: string) => `- \`${f}\``).join('\n') || '- TBD'}

### Estimated time
See decision card

---
*Generated by Growva Decision System v2*
*Ticket ID: ${ticket.id}*`

  const labels = [
    'growva-build',
    `priority-${ticket.priority}`,
    `${ticket.riskLevel}-change`,
  ]

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ title: ticket.title, body, labels }),
  })

  if (!res.ok) return null
  const data = await res.json()
  return { number: data.number, url: data.html_url }
}
