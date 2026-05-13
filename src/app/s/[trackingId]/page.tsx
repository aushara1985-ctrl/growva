import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import SprintPublicClient from './SprintPublicClient'

interface Props {
  params: { trackingId: string }
}

export async function generateMetadata({ params }: Props) {
  const experiment = await prisma.experiment.findUnique({
    where: { trackingId: params.trackingId },
    select: { metadata: true, product: { select: { name: true } } },
  })

  if (!experiment) return { title: 'Not found' }

  const meta = (experiment.metadata as any) ?? {}
  const hypothesis = meta.hypothesis ?? 'Early access'
  const productName = experiment.product?.name ?? 'Product'

  return {
    title: `${productName} — ${hypothesis}`,
    description: hypothesis,
  }
}

export default async function SprintPublicPage({ params }: Props) {
  const experiment = await prisma.experiment.findUnique({
    where: { trackingId: params.trackingId },
    select: {
      id: true,
      status: true,
      metadata: true,
      product: {
        select: { name: true, targetUser: true, url: true },
      },
    },
  })

  if (!experiment) notFound()

  // If the product has a URL, they should've been redirected already by /api/track.
  // Reaching here without a URL is the normal Sprint Mode case.
  // If they have a URL, just show the page anyway (graceful).

  const meta = (experiment.metadata as any) ?? {}
  const hypothesis: string = meta.hypothesis ?? experiment.product?.name ?? 'Early access'
  const targetAudience: string = meta.targetAudience ?? experiment.product?.targetUser ?? ''
  const productName: string = experiment.product?.name ?? 'Product'
  const isClosed = experiment.status === 'KILLED'

  return (
    <SprintPublicClient
      trackingId={params.trackingId}
      productName={productName}
      hypothesis={hypothesis}
      targetAudience={targetAudience}
      isClosed={isClosed}
    />
  )
}
