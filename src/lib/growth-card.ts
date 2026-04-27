import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder' })

export interface GrowthCardData {
  metricLabel: string
  metricValue: string
  headline: string
  description: string
  tweetText: string
}

export async function generateGrowthCard(data: {
  productName: string
  experimentAngle: string
  experimentType: string
  conversionRate: number
  revenue: number
  pageViews: number
  signups: number
  daysRunning: number
}): Promise<GrowthCardData> {
  const convPct = (data.conversionRate * 100).toFixed(1)
  const hasRevenue = data.revenue > 0

  const prompt = `Generate a shareable growth card for a winning experiment.

Product: ${data.productName}
Experiment: ${data.experimentType} — "${data.experimentAngle}"
Results:
- Conversion rate: ${convPct}%
- Views: ${data.pageViews}
- Signups: ${data.signups}
- Revenue: $${data.revenue.toFixed(0)}
- Days running: ${data.daysRunning}

Return ONLY valid JSON:
{
  "metricLabel": "the key metric name (e.g. 'Conversion rate', 'Revenue lift', 'Signups')",
  "metricValue": "the headline number (e.g. '+4.2%', '+$840', '47 signups')",
  "headline": "one punchy sentence about the win (under 10 words)",
  "description": "2 sentences explaining what worked and why it matters",
  "tweetText": "tweet-ready text under 240 chars — include the metric, what was tested, and attribute to Life Hack. No hashtags. Confident, not cringe."
}

Be specific. No generic copy. Make the founder proud to share this.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  return JSON.parse(response.choices[0].message.content || '{}')
}
