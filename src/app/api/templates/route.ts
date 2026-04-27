export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { TEMPLATES, getTemplatesForProduct, detectCategory, fillTemplate } from '@/lib/templates'

// GET /api/templates?productId=xxx
// Returns templates filtered for a product's category
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') as any
  const templates = category ? getTemplatesForProduct(category) : TEMPLATES
  return NextResponse.json(templates)
}

// POST /api/templates/apply — apply a template to a product
export async function POST(req: NextRequest) {
  const { templateId, product } = await req.json()

  const template = TEMPLATES.find(t => t.id === templateId)
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const filled = fillTemplate(template, product)
  return NextResponse.json({ template, filled })
}
