/**
 * Experiment Templates Library
 * Phase 2 — Moat
 *
 * بدل ما الـ AI يولّد random — هذه templates مجرّبة
 * كل template مبني على pattern حقيقي نجح في منتجات مشابهة
 */

export type ProductCategory =
  | 'saas_b2b'
  | 'saas_b2c'
  | 'marketplace'
  | 'content'
  | 'ecommerce'
  | 'service'

export interface ExperimentTemplate {
  id: string
  name: string
  category: ProductCategory[]
  type: string
  angle: string
  hypothesis: string
  headlineFormula: string
  copyFormula: string
  ctaFormula: string
  channel: string
  expectedKpi: string
  avgConversionRate: string
  whenToUse: string
  successCondition: string
  failCondition: string
  tags: string[]
}

export const TEMPLATES: ExperimentTemplate[] = [

  // ─── SAAS B2B ────────────────────────────────────────────────────────────
  {
    id: 'saas-pain-led',
    name: 'Pain-Led Offer',
    category: ['saas_b2b', 'saas_b2c'],
    type: 'LANDING_PAGE',
    angle: 'Lead with the pain, not the product',
    hypothesis: 'Naming the exact problem converts better than describing features',
    headlineFormula: 'Stop [painful activity] every [time period]',
    copyFormula: '[Target user] wastes [X hours/amount] on [pain]. [Product] eliminates it in [time].',
    ctaFormula: 'Stop [pain] now',
    channel: 'organic_social',
    expectedKpi: 'signup_rate',
    avgConversionRate: '3-6%',
    whenToUse: 'Early stage, no brand awareness, cold audience',
    successCondition: 'conv_rate > 3%',
    failCondition: 'conv_rate < 0.5% after 100 views',
    tags: ['cold_audience', 'early_stage', 'b2b', 'b2c'],
  },

  {
    id: 'saas-roi-anchor',
    name: 'ROI Anchor',
    category: ['saas_b2b'],
    type: 'OFFER_TEST',
    angle: 'Anchor to money saved or made',
    hypothesis: 'Buyers justify SaaS with ROI — make it concrete and immediate',
    headlineFormula: 'Save [X hours/amount] per [week/month] — or pay nothing',
    copyFormula: 'Teams using [product] recover [cost] in [X days]. 14-day trial. No credit card.',
    ctaFormula: 'Calculate my ROI',
    channel: 'paid_ads',
    expectedKpi: 'signup_rate',
    avgConversionRate: '4-8%',
    whenToUse: 'When product has measurable time/money saving',
    successCondition: 'conv_rate > 4%',
    failCondition: 'conv_rate < 1% after 150 views',
    tags: ['roi', 'b2b', 'paid', 'conversion'],
  },

  {
    id: 'saas-founder-story',
    name: 'Founder Story',
    category: ['saas_b2b', 'saas_b2c'],
    type: 'CONTENT_ANGLE',
    angle: 'Built this because I had the same problem',
    hypothesis: 'Authenticity and relatability outperform polished marketing for early adopters',
    headlineFormula: 'I built [product] because [personal pain story in 1 line]',
    copyFormula: 'As a [target user], I spent [X] doing [pain] manually. So I built [product]. Now [outcome].',
    ctaFormula: 'Read the story',
    channel: 'organic_social',
    expectedKpi: 'click_rate',
    avgConversionRate: '5-12% CTR',
    whenToUse: 'Pre-launch or early launch, founder has credibility in the space',
    successCondition: 'click_rate > 5%',
    failCondition: 'click_rate < 1%',
    tags: ['founder_led', 'authenticity', 'early_stage', 'content'],
  },

  {
    id: 'saas-waitlist-scarcity',
    name: 'Waitlist + Scarcity',
    category: ['saas_b2b', 'saas_b2c'],
    type: 'OFFER_TEST',
    angle: 'Limited access creates perceived value',
    hypothesis: 'Scarcity increases urgency and filters for serious users',
    headlineFormula: '[Product] is invite-only. [X] spots left this month.',
    copyFormula: 'We\'re onboarding [X] new [target users] this month. Join the waitlist — [benefit of early access].',
    ctaFormula: 'Request access',
    channel: 'referral',
    expectedKpi: 'signup_rate',
    avgConversionRate: '8-15%',
    whenToUse: 'Pre-launch or controlled rollout phase',
    successCondition: 'conv_rate > 8%',
    failCondition: 'conv_rate < 2%',
    tags: ['scarcity', 'pre_launch', 'waitlist', 'exclusivity'],
  },

  {
    id: 'saas-social-proof-number',
    name: 'Social Proof — Number',
    category: ['saas_b2b', 'saas_b2c', 'marketplace'],
    type: 'LANDING_PAGE',
    angle: 'Numbers build instant credibility',
    hypothesis: 'Specific numbers (not round) feel more authentic and credible',
    headlineFormula: '[Specific number] [target users] use [product] to [outcome]',
    copyFormula: 'Join [number] [target users] who [specific outcome]. Setup in [X minutes].',
    ctaFormula: 'Join them',
    channel: 'paid_ads',
    expectedKpi: 'signup_rate',
    avgConversionRate: '3-7%',
    whenToUse: 'After first 50+ users — use real numbers',
    successCondition: 'conv_rate > 3%',
    failCondition: 'conv_rate < 0.8%',
    tags: ['social_proof', 'credibility', 'numbers'],
  },

  // ─── PRICING TESTS ───────────────────────────────────────────────────────
  {
    id: 'pricing-risk-reversal',
    name: 'Risk Reversal',
    category: ['saas_b2b', 'saas_b2c', 'service'],
    type: 'PRICING_TEST',
    angle: 'Remove all risk from the buyer side',
    hypothesis: 'Objection to trying is risk — remove it completely',
    headlineFormula: 'Try [product] free for [X] days. Cancel anytime. No card needed.',
    copyFormula: 'We\'re confident you\'ll see [result] in [X days]. If not, you pay nothing. Ever.',
    ctaFormula: 'Start free trial',
    channel: 'email',
    expectedKpi: 'signup_rate',
    avgConversionRate: '6-12%',
    whenToUse: 'High-intent traffic, known objection is risk/commitment',
    successCondition: 'conv_rate > 6%',
    failCondition: 'conv_rate < 1.5%',
    tags: ['pricing', 'free_trial', 'risk_reversal', 'high_intent'],
  },

  {
    id: 'pricing-anchor',
    name: 'Price Anchoring',
    category: ['saas_b2b', 'saas_b2c'],
    type: 'PRICING_TEST',
    angle: 'Show what it replaces to anchor the price',
    hypothesis: 'Comparing to alternatives makes price feel cheap',
    headlineFormula: 'Replaces [expensive alternative] at [fraction] of the cost',
    copyFormula: '[Target users] pay $[X]/month for [alternative]. [Product] does the same for $[Y]. [Key difference].',
    ctaFormula: 'Switch today',
    channel: 'seo',
    expectedKpi: 'signup_rate',
    avgConversionRate: '4-9%',
    whenToUse: 'When there\'s a clear, expensive alternative',
    successCondition: 'conv_rate > 4%',
    failCondition: 'conv_rate < 1%',
    tags: ['pricing', 'anchoring', 'competitive', 'value'],
  },

  // ─── MARKETPLACE / B2C ───────────────────────────────────────────────────
  {
    id: 'marketplace-fomo',
    name: 'FOMO + Social Activity',
    category: ['marketplace', 'saas_b2c', 'ecommerce'],
    type: 'LANDING_PAGE',
    angle: 'Show live activity to trigger fear of missing out',
    hypothesis: 'Real-time social signals create urgency without fake tactics',
    headlineFormula: '[X] people joined [product] this week. Don\'t miss [specific benefit].',
    copyFormula: 'Right now, [X] [target users] are [doing activity on product]. [Outcome they\'re getting].',
    ctaFormula: 'Join now',
    channel: 'organic_social',
    expectedKpi: 'signup_rate',
    avgConversionRate: '4-10%',
    whenToUse: 'Growing product with visible activity',
    successCondition: 'conv_rate > 4%',
    failCondition: 'conv_rate < 1%',
    tags: ['fomo', 'social_proof', 'urgency', 'b2c'],
  },

  {
    id: 'b2c-identity',
    name: 'Identity-Based',
    category: ['saas_b2c', 'content', 'marketplace'],
    type: 'CONTENT_ANGLE',
    angle: 'Speak to who they want to be, not what they need',
    hypothesis: 'Identity resonates deeper than utility for B2C',
    headlineFormula: 'For [target users] who take [specific thing] seriously',
    copyFormula: 'You\'re not just a [generic label]. You\'re [aspirational identity]. [Product] is built for you.',
    ctaFormula: 'This is for me',
    channel: 'organic_social',
    expectedKpi: 'click_rate',
    avgConversionRate: '6-15% CTR',
    whenToUse: 'B2C with strong community or identity angle',
    successCondition: 'click_rate > 6%',
    failCondition: 'click_rate < 1%',
    tags: ['identity', 'community', 'b2c', 'aspirational'],
  },

  // ─── AD COPY ─────────────────────────────────────────────────────────────
  {
    id: 'ad-question-hook',
    name: 'Question Hook Ad',
    category: ['saas_b2b', 'saas_b2c', 'service'],
    type: 'AD_COPY',
    angle: 'Open a loop with a question they can\'t ignore',
    hypothesis: 'Questions engage the brain automatically — can\'t scroll past without answering',
    headlineFormula: 'Still doing [painful task] manually?',
    copyFormula: 'Most [target users] waste [X time] on [task]. [Product] does it in [X minutes]. [Proof point].',
    ctaFormula: 'See how',
    channel: 'paid_ads',
    expectedKpi: 'click_rate',
    avgConversionRate: '2-5% CTR',
    whenToUse: 'Cold paid traffic, awareness stage',
    successCondition: 'ctr > 2%',
    failCondition: 'ctr < 0.3%',
    tags: ['ads', 'cold_traffic', 'question', 'awareness'],
  },

  {
    id: 'ad-before-after',
    name: 'Before / After',
    category: ['saas_b2b', 'saas_b2c', 'service', 'ecommerce'],
    type: 'AD_COPY',
    angle: 'Show transformation, not features',
    hypothesis: 'Contrast creates desire — before state is painful, after state is the dream',
    headlineFormula: 'Before [product]: [painful state]. After: [dream state].',
    copyFormula: '[Before: specific painful scenario]. With [product]: [after: specific dream scenario]. [X] users made this switch.',
    ctaFormula: 'Make the switch',
    channel: 'paid_ads',
    expectedKpi: 'click_rate',
    avgConversionRate: '3-7% CTR',
    whenToUse: 'Retargeting or warm audience who knows the pain',
    successCondition: 'ctr > 3%',
    failCondition: 'ctr < 0.5%',
    tags: ['ads', 'transformation', 'before_after', 'retargeting'],
  },

  // ─── SAUDI MARKET SPECIFIC ───────────────────────────────────────────────
  {
    id: 'saudi-arabic-trust',
    name: 'Arabic Trust Signals',
    category: ['saas_b2b', 'saas_b2c', 'service'],
    type: 'LANDING_PAGE',
    angle: 'Local trust: Saudi-made, Saudi-understood',
    hypothesis: 'Saudi users trust products that explicitly address local context',
    headlineFormula: 'مصمم لـ[target users] في السعودية',
    copyFormula: '[Product] مبني خصيصاً لـ[pain point] في السوق السعودي. يدعم العربية + الإنجليزية. [proof point].',
    ctaFormula: 'ابدأ مجاناً',
    channel: 'organic_social',
    expectedKpi: 'signup_rate',
    avgConversionRate: '5-12%',
    whenToUse: 'Saudi or Arabic-speaking target market',
    successCondition: 'conv_rate > 5%',
    failCondition: 'conv_rate < 1%',
    tags: ['saudi', 'arabic', 'local_trust', 'rtl'],
  },

  {
    id: 'saudi-whatsapp-first',
    name: 'WhatsApp-First CTA',
    category: ['saas_b2b', 'service', 'marketplace'],
    type: 'OFFER_TEST',
    angle: 'Saudi users prefer WhatsApp over email forms',
    hypothesis: 'Lower friction CTA via WhatsApp gets more conversions in Saudi market',
    headlineFormula: 'تواصل معنا على واتساب وابدأ خلال 24 ساعة',
    copyFormula: 'مو عارف من وين تبدأ؟ راسلنا على واتساب وخلّنا نساعدك نفس اليوم.',
    ctaFormula: 'راسلنا الآن',
    channel: 'organic_social',
    expectedKpi: 'click_rate',
    avgConversionRate: '8-18% CTR',
    whenToUse: 'B2B or service with Saudi target, high-touch sales',
    successCondition: 'ctr > 8%',
    failCondition: 'ctr < 2%',
    tags: ['saudi', 'whatsapp', 'high_touch', 'local'],
  },
]

// Filter templates by category
export function getTemplatesForProduct(category: ProductCategory): ExperimentTemplate[] {
  return TEMPLATES.filter(t => t.category.includes(category))
}

// Get template by id
export function getTemplate(id: string): ExperimentTemplate | undefined {
  return TEMPLATES.find(t => t.id === id)
}

// Detect product category from description
export function detectCategory(description: string, targetUser: string): ProductCategory {
  const text = (description + ' ' + targetUser).toLowerCase()
  if (text.includes('b2b') || text.includes('team') || text.includes('business') || text.includes('شركة') || text.includes('فريق')) return 'saas_b2b'
  if (text.includes('marketplace') || text.includes('platform') || text.includes('منصة')) return 'marketplace'
  if (text.includes('content') || text.includes('media') || text.includes('محتوى')) return 'content'
  if (text.includes('shop') || text.includes('store') || text.includes('متجر')) return 'ecommerce'
  if (text.includes('service') || text.includes('agency') || text.includes('خدمة')) return 'service'
  return 'saas_b2c'
}

// Fill template with product context
export function fillTemplate(
  template: ExperimentTemplate,
  product: { name: string; description: string; targetUser: string; price?: number }
): {
  type: string
  angle: string
  headline: string
  copy: string
  cta: string
  distributionChannel: string
  expectedKpi: string
  templateId: string
} {
  const fill = (formula: string) =>
    formula
      .replace('[product]', product.name)
      .replace('[Product]', product.name)
      .replace('[target user]', product.targetUser)
      .replace('[target users]', product.targetUser)
      .replace('[Target users]', product.targetUser)
      .replace('[X]', '3')
      .replace('[X hours/amount]', '3 hours')
      .replace('[X minutes]', '5 minutes')
      .replace('[X days]', '14 days')
      .replace('[X time]', '3 hours/week')
      .replace('[cost]', product.price ? `$${product.price}` : 'the cost')
      .replace('[Y]', product.price ? `$${Math.round(product.price * 0.3)}` : 'less')

  return {
    type: template.type,
    angle: template.angle,
    headline: fill(template.headlineFormula),
    copy: fill(template.copyFormula),
    cta: fill(template.ctaFormula),
    distributionChannel: template.channel,
    expectedKpi: template.expectedKpi,
    templateId: template.id,
  }
}
