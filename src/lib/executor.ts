import OpenAI from 'openai'
import { prisma } from '@/lib/db'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' })

export type ExecutionActionType =
  | 'REWRITE_COPY' | 'UPDATE_PRICING' | 'CREATE_INVOICE'
  | 'CREATE_STRIPE_CHECKOUT' | 'LAUNCH_EXPERIMENT' | 'SEND_OUTREACH'
  | 'GENERATE_FEATURE_SPEC' | 'BUILD_FEATURE_PLAN' | 'CREATE_BACKLOG_ITEM'
  | 'UPDATE_PLAYBOOK' | 'CREATE_GROWTH_CARD' | 'PAUSE_PRODUCT'
  | 'SCALE_PRODUCT' | 'FLAG_FOR_APPROVAL'

const SAFE_ACTIONS: ExecutionActionType[] = [
  'REWRITE_COPY','GENERATE_FEATURE_SPEC','BUILD_FEATURE_PLAN',
  'CREATE_BACKLOG_ITEM','UPDATE_PLAYBOOK','CREATE_GROWTH_CARD','LAUNCH_EXPERIMENT',
]
const DANGEROUS_ACTIONS: ExecutionActionType[] = [
  'UPDATE_PRICING','CREATE_INVOICE','CREATE_STRIPE_CHECKOUT',
  'SEND_OUTREACH','PAUSE_PRODUCT','SCALE_PRODUCT',
]

export interface ExecutionAction {
  type: ExecutionActionType
  payload: any
  reasoning: string
  riskLevel: 'low'|'medium'|'high'
  expectedImpact: string
}

export interface ExecutionInput {
  productId: string; decision: string; productContext: any
  brainMemory?: any; predictiveResult?: any; winningPatterns?: any[]
  marketSignals?: string[]; competitorSignals?: any[]
  requestedFeatures?: any[]; billingStatus?: any
}

export interface ExecutionOutput {
  actions: ExecutionAction[]; requiresApproval: boolean
  approvalActions: ExecutionAction[]; safeActions: ExecutionAction[]; summary: string
}

export async function runExecutor(input: ExecutionInput): Promise<ExecutionOutput> {
  const prompt = `You are a product execution agent for Growva. Convert this decision into specific executable actions.

Product: ${input.productContext?.name} — ${input.productContext?.description}
Target: ${input.productContext?.targetUser}
Decision: ${input.decision}
Brain Memory: ${JSON.stringify(input.brainMemory||{}).slice(0,300)}
Winning Patterns: ${JSON.stringify(input.winningPatterns||[]).slice(0,300)}
Market Signals: ${(input.marketSignals||[]).join('; ')}
Competitor Signals: ${JSON.stringify(input.competitorSignals||[]).slice(0,200)}
Feature Requests: ${JSON.stringify(input.requestedFeatures||[]).slice(0,200)}

SAFE (auto-run): REWRITE_COPY, GENERATE_FEATURE_SPEC, BUILD_FEATURE_PLAN, CREATE_BACKLOG_ITEM, UPDATE_PLAYBOOK, CREATE_GROWTH_CARD, LAUNCH_EXPERIMENT
REQUIRES APPROVAL: UPDATE_PRICING, CREATE_INVOICE, CREATE_STRIPE_CHECKOUT, SEND_OUTREACH, PAUSE_PRODUCT, SCALE_PRODUCT

Generate 2-4 specific actions. Be concrete — include actual copy, specs, or plans in payload.
Return ONLY JSON: { "actions": [{ "type": "ACTION_TYPE", "payload": {}, "reasoning": "why", "riskLevel": "low|medium|high", "expectedImpact": "what changes" }], "summary": "one sentence" }`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.5,
  })

  const parsed = JSON.parse(res.choices[0].message.content || '{}')
  const actions: ExecutionAction[] = parsed.actions || []
  const safeActions = actions.filter(a => SAFE_ACTIONS.includes(a.type))
  const approvalActions = actions.filter(a => DANGEROUS_ACTIONS.includes(a.type))

  for (const action of actions) await logExecution(input.productId, action, 'pending')
  for (const action of safeActions) await executeSafeAction(input.productId, action)
  for (const action of approvalActions) await queueForApproval(input.productId, action)

  return { actions, requiresApproval: approvalActions.length > 0, approvalActions, safeActions, summary: parsed.summary || 'Execution complete.' }
}

async function executeSafeAction(productId: string, action: ExecutionAction) {
  try {
    if (action.type === 'GENERATE_FEATURE_SPEC') {
      await prisma.featureRequest.create({
        data: {
          productId, source: 'analytics',
          rawText: action.payload?.description || '',
          normalizedFeature: action.payload?.featureName || '',
          frequency: 1, urgencyScore: action.payload?.urgency || 5,
          willingnessToPayScore: action.payload?.wtp || 5,
          competitorGapScore: action.payload?.competitorGap || 5,
          buildComplexityScore: action.payload?.complexity || 5,
          monopolyScore: action.payload?.monopolyScore || 5,
          revenuePotentialScore: action.payload?.revenuePotential || 5,
          opportunityScore: 5, status: 'scored',
          reasoning: action.reasoning,
          suggestedImpl: JSON.stringify(action.payload),
        },
      }).catch(() => {})
    }
    if (action.type === 'LAUNCH_EXPERIMENT' && action.payload?.angle) {
      await prisma.experiment.create({
        data: {
          productId, type: action.payload.type || 'LANDING_PAGE',
          angle: action.payload.angle, headline: action.payload.headline || '',
          copy: action.payload.copy || '', cta: action.payload.cta || 'Get started',
          distributionChannel: action.payload.channel || 'organic_social',
          expectedKpi: action.payload.kpi || 'signup_rate',
          status: 'ACTIVE', startedAt: new Date(),
        },
      }).catch(() => {})
    }
    await logExecution(productId, action, 'success', action.payload)
  } catch (err) {
    await logExecution(productId, action, 'failed', null, String(err))
  }
}

export async function logExecution(productId: string, action: ExecutionAction, status: string, output?: any, error?: string) {
  await prisma.executionActionLog.create({
    data: { productId, actionType: action.type, inputJson: action.payload || {}, outputJson: output || {}, status, errorMessage: error || null },
  }).catch(() => {})
}

async function queueForApproval(productId: string, action: ExecutionAction) {
  await prisma.executionApproval.create({
    data: { productId, actionType: action.type, proposedAction: action.payload || {}, riskLevel: action.riskLevel || 'medium', status: 'pending' },
  }).catch(() => {})
}

export async function getExecutionQueue(productId?: string) {
  const [pending, recent] = await Promise.all([
    prisma.executionApproval.findMany({ where: { status: 'pending', ...(productId && { productId }) }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.executionActionLog.findMany({ where: productId ? { productId } : {}, orderBy: { createdAt: 'desc' }, take: 50 }),
  ])
  return { pending, recent }
}

export async function approveAction(approvalId: string) {
  const approval = await prisma.executionApproval.findUnique({ where: { id: approvalId } })
  if (!approval || approval.status !== 'pending') return
  await prisma.executionApproval.update({ where: { id: approvalId }, data: { status: 'executed', executedAt: new Date() } })
  await prisma.executionActionLog.create({
    data: { productId: approval.productId, actionType: approval.actionType, inputJson: approval.proposedAction as any, outputJson: { approved: true }, status: 'success' },
  }).catch(() => {})
}

export async function rejectAction(approvalId: string) {
  await prisma.executionApproval.update({ where: { id: approvalId }, data: { status: 'rejected' } }).catch(() => {})
}
