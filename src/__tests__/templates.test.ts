import {
  TEMPLATES,
  getTemplatesForProduct,
  getTemplate,
  detectCategory,
  fillTemplate,
  ProductCategory,
} from '@/lib/templates'

describe('TEMPLATES', () => {
  it('has at least 10 templates', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(10)
  })

  it('every template has required fields', () => {
    TEMPLATES.forEach(t => {
      expect(t.id).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.category.length).toBeGreaterThan(0)
      expect(t.type).toBeTruthy()
      expect(t.angle).toBeTruthy()
      expect(t.hypothesis).toBeTruthy()
      expect(t.headlineFormula).toBeTruthy()
      expect(t.copyFormula).toBeTruthy()
      expect(t.ctaFormula).toBeTruthy()
      expect(t.channel).toBeTruthy()
      expect(t.expectedKpi).toBeTruthy()
      expect(t.avgConversionRate).toBeTruthy()
      expect(t.successCondition).toBeTruthy()
      expect(t.failCondition).toBeTruthy()
      expect(t.tags.length).toBeGreaterThan(0)
    })
  })

  it('has no duplicate ids', () => {
    const ids = TEMPLATES.map(t => t.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('all types are valid ExperimentType values', () => {
    const valid = ['LANDING_PAGE', 'PRICING_TEST', 'OFFER_TEST', 'CONTENT_ANGLE', 'AD_COPY']
    TEMPLATES.forEach(t => {
      expect(valid).toContain(t.type)
    })
  })

  it('all channels are valid values', () => {
    const valid = ['organic_social', 'paid_ads', 'email', 'seo', 'referral']
    TEMPLATES.forEach(t => {
      expect(valid).toContain(t.channel)
    })
  })
})

describe('getTemplatesForProduct', () => {
  it('returns templates for saas_b2b', () => {
    const results = getTemplatesForProduct('saas_b2b')
    expect(results.length).toBeGreaterThan(0)
    results.forEach(t => expect(t.category).toContain('saas_b2b'))
  })

  it('returns templates for saas_b2c', () => {
    const results = getTemplatesForProduct('saas_b2c')
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns templates for marketplace', () => {
    const results = getTemplatesForProduct('marketplace')
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns empty array for unknown category', () => {
    const results = getTemplatesForProduct('unknown' as ProductCategory)
    expect(results).toEqual([])
  })

  it('saas_b2b has more templates than ecommerce', () => {
    const b2b = getTemplatesForProduct('saas_b2b')
    const ecom = getTemplatesForProduct('ecommerce')
    expect(b2b.length).toBeGreaterThanOrEqual(ecom.length)
  })
})

describe('getTemplate', () => {
  it('returns template by valid id', () => {
    const t = getTemplate('saas-pain-led')
    expect(t).toBeDefined()
    expect(t?.id).toBe('saas-pain-led')
  })

  it('returns undefined for unknown id', () => {
    const t = getTemplate('does-not-exist')
    expect(t).toBeUndefined()
  })

  it('can retrieve every template by its own id', () => {
    TEMPLATES.forEach(template => {
      const found = getTemplate(template.id)
      expect(found).toBeDefined()
      expect(found?.id).toBe(template.id)
    })
  })
})

describe('detectCategory', () => {
  it('detects saas_b2b from team/business keywords', () => {
    expect(detectCategory('CRM for sales teams', 'B2B teams')).toBe('saas_b2b')
    expect(detectCategory('business automation tool', 'companies')).toBe('saas_b2b')
  })

  it('detects marketplace from platform keywords', () => {
    expect(detectCategory('a marketplace for freelancers', 'buyers and sellers')).toBe('marketplace')
    expect(detectCategory('منصة للعمل الحر', 'المستقلين')).toBe('marketplace')
  })

  it('detects ecommerce from shop keywords', () => {
    expect(detectCategory('online store builder', 'متجر إلكتروني')).toBe('ecommerce')
  })

  it('detects service from agency keywords', () => {
    expect(detectCategory('marketing agency tool', 'خدمة تسويق')).toBe('service')
  })

  it('defaults to saas_b2c for generic descriptions', () => {
    expect(detectCategory('a cool productivity app', 'individuals')).toBe('saas_b2c')
  })

  it('detects Arabic B2B signals', () => {
    expect(detectCategory('أداة لإدارة الفريق', 'فريق العمل')).toBe('saas_b2b')
  })
})

describe('fillTemplate', () => {
  const product = {
    name: 'Inab',
    description: 'Appointment scheduling SaaS',
    targetUser: 'Saudi freelancers',
    price: 29,
  }

  it('returns all required fields', () => {
    const template = TEMPLATES[0]
    const filled = fillTemplate(template, product)
    expect(filled.type).toBeTruthy()
    expect(filled.angle).toBeTruthy()
    expect(filled.headline).toBeTruthy()
    expect(filled.copy).toBeTruthy()
    expect(filled.cta).toBeTruthy()
    expect(filled.distributionChannel).toBeTruthy()
    expect(filled.expectedKpi).toBeTruthy()
    expect(filled.templateId).toBe(template.id)
  })

  it('injects product name into headline', () => {
    const template = TEMPLATES.find(t => t.headlineFormula.includes('[product]') || t.headlineFormula.includes('[Product]'))
    if (!template) return
    const filled = fillTemplate(template, product)
    expect(filled.headline).toContain('Inab')
  })

  it('injects target user into copy', () => {
    const template = TEMPLATES.find(t =>
      t.copyFormula.includes('[target users]') || t.copyFormula.includes('[Target users]')
    )
    if (!template) return
    const filled = fillTemplate(template, product)
    expect(filled.copy).toContain('Saudi freelancers')
  })

  it('preserves channel from template', () => {
    const template = TEMPLATES[0]
    const filled = fillTemplate(template, product)
    expect(filled.distributionChannel).toBe(template.channel)
  })

  it('preserves kpi from template', () => {
    const template = TEMPLATES[0]
    const filled = fillTemplate(template, product)
    expect(filled.expectedKpi).toBe(template.expectedKpi)
  })

  it('works for product without price', () => {
    const template = TEMPLATES[0]
    const noPriceProd = { ...product, price: undefined }
    expect(() => fillTemplate(template, noPriceProd)).not.toThrow()
  })

  it('works for all templates without throwing', () => {
    TEMPLATES.forEach(template => {
      expect(() => fillTemplate(template, product)).not.toThrow()
    })
  })
})
