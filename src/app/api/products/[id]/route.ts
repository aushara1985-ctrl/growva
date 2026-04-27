import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateExperiments } from '@/lib/ai'
import { detectCategory, getTemplatesForProduct, fillTemplate } from '@/lib/templates'
import { generateExperimentsWithBrain } from '@/lib/brain'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      experiments: { orderBy: { createdAt: 'desc' } },
      decisions: { orderBy: { createdAt: 'desc' }, take: 20 },
      events: { orderBy: { createdAt: 'desc' }, take: 50 },
      winningPatterns: { orderBy: { conversionRate: 'desc' }, take: 5 },
      score: true,
    },
  })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(product)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({ where: { id: params.id } })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.product.update({ where: { id: params.id }, data: { isActive: true } })

  const pastWinners = await prisma.winningPattern.findMany({
    where: { productId: product.id },
    orderBy: { conversionRate: 'desc' },
    take: 5,
  })

  // Hybrid: templates first + AI fills the rest
  const category = detectCategory(product.description, product.targetUser)
  const templates = getTemplatesForProduct(category)

  let experiments = []

  if (templates.length >= 2) {
    // Pick 2 best-fit templates + 1 AI-generated
    const picked = templates.slice(0, 2)
    const templateExps = picked.map(t => fillTemplate(t, {
      name: product.name,
      description: product.description,
      targetUser: product.targetUser,
      price: product.price || undefined,
    }))

    // 1 AI experiment based on winning patterns
    const aiExps = await generateExperimentsWithBrain(
      { id: product.id, name: product.name, description: product.description, price: product.price, targetUser: product.targetUser, goal: product.goal },
      pastWinners.map(w => ({ type: w.experimentType, angle: w.angle, channel: w.channel, conversionRate: w.conversionRate }))
    )

    experiments = [...templateExps, ...(aiExps.slice(0, 1))]
  } else {
    // Pure AI if no templates match
    const aiExps = await generateExperimentsWithBrain(
      { id: product.id, name: product.name, description: product.description, price: product.price, targetUser: product.targetUser, goal: product.goal },
      pastWinners.map(w => ({ type: w.experimentType, angle: w.angle, channel: w.channel, conversionRate: w.conversionRate }))
    )
    experiments = aiExps
  }

  const created = await Promise.all(
    experiments.map((exp: any) =>
      prisma.experiment.create({
        data: {
          productId: product.id,
          type: exp.type as any,
          angle: exp.angle,
          headline: exp.headline,
          copy: exp.copy,
          cta: exp.cta,
          distributionChannel: exp.distributionChannel,
          expectedKpi: exp.expectedKpi,
          status: 'ACTIVE',
        },
      })
    )
  )

  return NextResponse.json({ message: 'Growth mode started', experiments: created, category })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.product.delete({ where: { id: params.id } })
  return NextResponse.json({ message: 'Deleted' })
}
