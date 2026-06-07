import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { generateExperiments } from '@/lib/ai'
import { detectCategory, getTemplatesForProduct, fillTemplate } from '@/lib/templates'
import { generateExperimentsWithBrain } from '@/lib/brain'

async function requireOwnership(req: NextRequest, productId: string) {
  const session = getUserFromRequest(req)
  if (!session) return { error: 'Unauthenticated', status: 401 }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return { error: 'Not found', status: 404 }

  // Strict ownership: block unless the product belongs to this user.
  // New products are always created with an owner; legacy unowned products are
  // claimed for the admin via backfill on login — so an unowned product must
  // never be readable by an arbitrary signed-in user.
  if (product.userId !== session.userId) {
    return { error: 'Forbidden', status: 403 }
  }

  return { product, session }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const check = await requireOwnership(req, params.id)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

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
  const check = await requireOwnership(req, params.id)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const { product } = check

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
    const picked = templates.slice(0, 2)
    const templateExps = picked.map(t => fillTemplate(t, {
      name: product.name,
      description: product.description,
      targetUser: product.targetUser,
      price: product.price || undefined,
    }))

    const aiExps = await generateExperimentsWithBrain(
      { id: product.id, name: product.name, description: product.description, price: product.price, targetUser: product.targetUser, goal: product.goal },
      pastWinners.map(w => ({ type: w.experimentType, angle: w.angle, channel: w.channel, conversionRate: w.conversionRate }))
    )

    experiments = [...templateExps, ...(aiExps.slice(0, 1))]
  } else {
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
          status: 'PENDING',
        },
      })
    )
  )

  return NextResponse.json({ message: 'Growth mode started', experiments: created, category })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const check = await requireOwnership(req, params.id)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  const body = await req.json()
  const updated = await prisma.product.update({
    where: { id: params.id },
    data: { metadata: body.metadata },
    select: { id: true, metadata: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const check = await requireOwnership(req, params.id)
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status })

  await prisma.product.delete({ where: { id: params.id } })
  return NextResponse.json({ message: 'Deleted' })
}
