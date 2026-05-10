import OpenAI from 'openai'

export type SprintType = 'DM' | 'X_POST' | 'REDDIT' | 'INTERVIEW' | 'LANDING_SEND' | 'PAID_ACCESS'

export interface SprintPlan {
  action: string
  script: string
  successThreshold: string
  weakThreshold: string
  killSignal: string
  generatedBy: 'openai' | 'fallback'
}

export interface SprintResult {
  replies: number
  paidInterest: number
  objections: string
  notes: string
}

export const SPRINT_TYPE_LABELS: Record<SprintType, { icon: string; label: string; desc: string }> = {
  DM:           { icon: '💬', label: 'DM 20 people',              desc: 'Personal outreach — best for B2B and niche communities' },
  X_POST:       { icon: '𝕏',  label: 'Post on X',                desc: 'Public validation — good if your audience is on Twitter' },
  REDDIT:       { icon: '↑',  label: 'Post on Reddit',            desc: 'Community validation — find the right subreddit first' },
  INTERVIEW:    { icon: '🎙', label: 'Interview 5 users',         desc: '5 calls — best for deep problem validation' },
  LANDING_SEND: { icon: '🔗', label: 'Send page to 10 founders',  desc: 'Direct link — get feedback on your landing or offer' },
  PAID_ACCESS:  { icon: '💳', label: 'Offer paid early access',   desc: 'Ultimate test — people vote with their wallet' },
}

const FALLBACK_TEMPLATES: Record<SprintType, (name: string, targetUser: string) => SprintPlan> = {
  DM: (name, targetUser) => ({
    action: `Find 20 ${targetUser} on Twitter, LinkedIn, or Discord and send a personal DM in the next 48 hours. Keep it short. Lead with the problem.`,
    script: `Hey [name], I'm building ${name} for ${targetUser}. Quick question — [describe the core pain in one sentence]. Does this sound familiar? Would love your honest take.\n\nHere's what I'm working on: {trackingLink}`,
    successThreshold: '6+ replies AND 3+ link clicks AND at least 1 person asking about price or requesting access',
    weakThreshold: 'Replies but zero clicks — your message is interesting but the offer is not clear enough yet',
    killSignal: 'Fewer than 3 replies, or nobody understands the problem you are describing',
    generatedBy: 'fallback',
  }),
  X_POST: (name, targetUser) => ({
    action: `Write one focused post on X targeting ${targetUser}. Lead with the pain, not the product. Include the tracking link in the post.`,
    script: `Most ${targetUser} are solving [pain] the hard way.\n\nI built ${name} to fix this.\n\nIf this sounds like you: {trackingLink}`,
    successThreshold: '20+ clicks AND 3+ signups or direct replies requesting access',
    weakThreshold: 'Likes and reposts but under 10 clicks — the hook works but the offer does not convert',
    killSignal: 'Under 5 clicks in 24 hours — wrong audience or wrong message',
    generatedBy: 'fallback',
  }),
  REDDIT: (name, targetUser) => ({
    action: `Find the most active subreddit for ${targetUser}. Write a post that gives genuine value first, then naturally introduces ${name} with the tracking link.`,
    script: `I spent time talking to ${targetUser} about [pain]. Here is what I found: [2-3 honest insights]. If you are dealing with this too, I built something that might help: {trackingLink}`,
    successThreshold: '30+ clicks AND 5+ comments AND 3+ signups',
    weakThreshold: 'Positive comments but under 15 clicks — the post resonates, the CTA is buried',
    killSignal: 'Under 10 clicks or post gets ignored',
    generatedBy: 'fallback',
  }),
  INTERVIEW: (name, targetUser) => ({
    action: `Schedule 5 calls with ${targetUser} in the next 48 hours. Focus on the problem, not the product. Ask about pain, current workarounds, and what the ideal solution would look like. Share the tracking link at the end.`,
    script: `"Tell me about the last time [pain] cost you time or money. How did you handle it? What did you wish existed?"\n\nAt the end: "I am building something for this. Would you take a look?" Then share {trackingLink}`,
    successThreshold: '3 or more out of 5 people ask about price or request early access',
    weakThreshold: '1-2 interested but no payment signal — validate willingness to pay before building more',
    killSignal: 'Nobody sees the problem clearly, or they are already satisfied with their current solution',
    generatedBy: 'fallback',
  }),
  LANDING_SEND: (name, targetUser) => ({
    action: `Send the tracking link directly to 10 ${targetUser} via DM, email, or Slack. Keep the message short. Do not over-explain.`,
    script: `Hey, I am working on something for ${targetUser} and you would know if this is actually a problem worth solving. Honest 30-second look? {trackingLink}`,
    successThreshold: '5+ clicks AND 2+ signups or explicit interest replies',
    weakThreshold: '3-4 clicks, no signups — the landing page is not converting the intent',
    killSignal: 'Under 2 clicks — wrong audience or message is not landing',
    generatedBy: 'fallback',
  }),
  PAID_ACCESS: (name, targetUser) => ({
    action: `Offer ${targetUser} paid early access to ${name} directly via DM or post. Be explicit about the price. No free tier framing. Use the tracking link.`,
    script: `I am giving 10 ${targetUser} early access to ${name} at [price]. This is for people who have the problem right now and want it solved. If that is you: {trackingLink}`,
    successThreshold: '3+ people asking to pay AND at least 1 completed payment or strong intent',
    weakThreshold: 'Interest but zero payment signal — validate the price point or the urgency',
    killSignal: 'Nobody engages with the paid offer, or everyone asks for a free version',
    generatedBy: 'fallback',
  }),
}

export async function generateSprintPlan(
  sprintType: SprintType,
  productName: string,
  hypothesis: string,
  targetAudience: string,
): Promise<SprintPlan> {
  const fallback = FALLBACK_TEMPLATES[sprintType](productName, targetAudience)

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) return fallback

  try {
    const client = new OpenAI({ apiKey: openaiKey })

    const prompt = `You are a startup growth coach helping a solo founder run a 48-hour validation sprint.

Product: ${productName}
Hypothesis: ${hypothesis}
Target audience: ${targetAudience}
Sprint type: ${sprintType}

Generate a focused, actionable sprint plan. Return valid JSON with exactly these fields:
- action: specific 1-2 sentence instruction (what to do, how many people, where)
- script: copy-paste ready message with {trackingLink} placeholder where the link goes
- successThreshold: what strong signal looks like in concrete numbers
- weakThreshold: what weak signal looks like and what it means
- killSignal: what clearly says to stop

Be direct and specific. No fluff. The founder needs to act within the next hour.`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 600,
      temperature: 0.7,
    })

    const parsed = JSON.parse(response.choices[0].message.content || '{}')
    if (parsed.action && parsed.script && parsed.successThreshold && parsed.weakThreshold && parsed.killSignal) {
      return { ...parsed, generatedBy: 'openai' as const }
    }
    return fallback
  } catch {
    return fallback
  }
}

export async function generateSprintNarrative(
  verdict: 'SCALE' | 'CONTINUE' | 'KILL',
  auto: { clicks: number; signups: number; pageViews: number; revenue: number },
  manual: Partial<SprintResult>,
  sprintType: SprintType,
  hypothesis: string,
  plan: SprintPlan,
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY

  const parts: string[] = []
  if (auto.clicks > 0)   parts.push(`${auto.clicks} link clicks`)
  if (auto.signups > 0)  parts.push(`${auto.signups} signups`)
  if (manual.replies && manual.replies > 0)      parts.push(`${manual.replies} replies`)
  if (manual.paidInterest && manual.paidInterest > 0) parts.push(`${manual.paidInterest} paid interest`)
  const signalStr = parts.length > 0 ? parts.join(', ') : 'no signal yet'

  if (!openaiKey) return fallbackNarrative(verdict, signalStr, plan)

  try {
    const client = new OpenAI({ apiKey: openaiKey })

    const prompt = `You are a blunt startup growth advisor. A founder ran a 48-hour validation sprint.

Hypothesis: ${hypothesis}
Sprint type: ${sprintType}
Signals collected: ${signalStr}
Success threshold: ${plan.successThreshold}
Weak threshold: ${plan.weakThreshold}
Kill signal: ${plan.killSignal}
Verdict: ${verdict}

Write a direct decision narrative. Structure it exactly like this:
${verdict === 'KILL' ? 'STOP' : verdict}

[1-2 sentences on what the numbers show]

[1 sentence on root cause]

Next action:
[1 specific, actionable next step]

Be blunt. No fluff. Maximum 80 words total.`

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.6,
    })

    return response.choices[0].message.content?.trim() || fallbackNarrative(verdict, signalStr, plan)
  } catch {
    return fallbackNarrative(verdict, signalStr, plan)
  }
}

function fallbackNarrative(verdict: 'SCALE' | 'CONTINUE' | 'KILL', signalStr: string, plan: SprintPlan): string {
  const label = verdict === 'KILL' ? 'STOP' : verdict

  if (verdict === 'SCALE') {
    return `${label}\n\nSignal: ${signalStr}.\n\nThis matches strong demand at validation stage.\n\nNext action: Double down. Run a larger sprint or move to the next stage.`
  }
  if (verdict === 'CONTINUE') {
    return `${label}\n\nSignal: ${signalStr}.\n\n${plan.weakThreshold}\n\nNext action: Sharpen the message and run one more sprint with a tighter offer.`
  }
  return `${label}\n\nSignal: ${signalStr}.\n\n${plan.killSignal}\n\nNext action: Stop. Rethink the hypothesis — change either the audience or the core promise before running another sprint.`
}

export function sprintVerdict(
  sprintType: SprintType,
  auto: { clicks: number; signups: number; pageViews: number; revenue: number },
  manual: Partial<SprintResult>,
): 'SCALE' | 'CONTINUE' | 'KILL' {
  const replies = manual.replies ?? 0
  const paid    = manual.paidInterest ?? 0
  const { clicks, signups } = auto

  switch (sprintType) {
    case 'DM':
      if (replies >= 6 && (paid > 0 || signups > 0)) return 'SCALE'
      if (replies >= 3 && clicks > 2)                return 'CONTINUE'
      return 'KILL'

    case 'X_POST':
      if (clicks >= 20 && signups >= 3)              return 'SCALE'
      if (clicks >= 10 || (clicks >= 5 && replies >= 5)) return 'CONTINUE'
      return 'KILL'

    case 'REDDIT':
      if (clicks >= 30 && signups >= 3)              return 'SCALE'
      if (clicks >= 15 && replies >= 5)              return 'CONTINUE'
      return 'KILL'

    case 'INTERVIEW':
      if (paid >= 3)                                 return 'SCALE'
      if (paid >= 1 && replies >= 3)                 return 'CONTINUE'
      return 'KILL'

    case 'LANDING_SEND':
      if (clicks >= 5 && signups >= 2)              return 'SCALE'
      if (clicks >= 3)                               return 'CONTINUE'
      return 'KILL'

    case 'PAID_ACCESS':
      if (paid >= 3 && signups >= 1)                return 'SCALE'
      if (paid >= 1)                                 return 'CONTINUE'
      return 'KILL'

    default:
      if (signups >= 5 || clicks >= 20)              return 'SCALE'
      if (signups >= 1 || clicks >= 5)               return 'CONTINUE'
      return 'KILL'
  }
}
