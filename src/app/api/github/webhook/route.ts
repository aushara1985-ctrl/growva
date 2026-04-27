export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createHmac } from 'crypto'

function verifyGitHubSignature(body: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret)
  const digest = 'sha256=' + hmac.update(body).digest('hex')
  try {
    const sigBuf = Buffer.from(signature)
    const digBuf = Buffer.from(digest)
    return sigBuf.length === digBuf.length &&
      sigBuf.every((byte, i) => byte === digBuf[i])
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const bodyText = await req.text()

  // Handle internal notifications from GitHub Actions
  const isInternal = req.headers.get('X-Growva-Internal') === 'true'
  if (!isInternal) {
    // Verify GitHub webhook signature
    const secret = process.env.GITHUB_WEBHOOK_SECRET
    if (secret) {
      const signature = req.headers.get('X-Hub-Signature-256') || ''
      if (!verifyGitHubSignature(bodyText, signature, secret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
  }

  let payload: any
  try {
    payload = JSON.parse(bodyText)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = req.headers.get('X-GitHub-Event') || payload.action
  console.log('[GitHub Webhook]', event, JSON.stringify(payload).slice(0, 200))

  // ── Internal action from GitHub Actions ──────────────────────────────────
  if (isInternal && payload.action) {
    return handleInternalAction(payload)
  }

  // ── GitHub webhook events ─────────────────────────────────────────────────
  switch (event) {
    case 'issues': {
      const issue = payload.issue
      if (!issue) break
      const issueNumber = issue.number

      if (payload.action === 'opened' || payload.action === 'labeled') {
        const hasGrowvaBuild = issue.labels?.some((l: any) => l.name === 'growva-build')
        if (hasGrowvaBuild) {
          await updateBuildTicketByIssue(issueNumber, {
            status: 'sent_to_github',
            githubIssueNumber: issueNumber,
            githubIssueUrl: issue.html_url,
          })
        }
      }
      break
    }

    case 'pull_request': {
      const pr = payload.pull_request
      if (!pr) break
      const body = pr.body || ''

      // Extract issue number from PR body (Closes #123)
      const issueMatch = body.match(/Closes #(\d+)/i) || body.match(/#(\d+)/)
      if (!issueMatch) break
      const issueNumber = parseInt(issueMatch[1])

      if (payload.action === 'opened' || payload.action === 'reopened') {
        await updateBuildTicketByIssue(issueNumber, {
          status: 'pr_opened',
          githubPrNumber: pr.number,
          githubPrUrl: pr.html_url,
          githubBranch: pr.head?.ref,
        })
      }

      if (payload.action === 'closed' && pr.merged) {
        await updateBuildTicketByIssue(issueNumber, { status: 'merged' })
      }
      break
    }

    case 'workflow_run': {
      if (payload.action === 'completed' && payload.workflow_run?.conclusion === 'failure') {
        // Try to find ticket by branch name
        const branch = payload.workflow_run?.head_branch || ''
        const branchMatch = branch.match(/growva\/build-ticket-(\d+)/)
        if (branchMatch) {
          const issueNumber = parseInt(branchMatch[1])
          await updateBuildTicketByIssue(issueNumber, { status: 'failed' })
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

async function handleInternalAction(payload: any): Promise<NextResponse> {
  const { action, issue_number, pr_number, pr_url, reason } = payload

  switch (action) {
    case 'pr_opened':
      await updateBuildTicketByIssue(issue_number, {
        status: 'pr_opened',
        githubPrNumber: pr_number,
        githubPrUrl: pr_url,
      })
      break

    case 'build_failed':
      await updateBuildTicketByIssue(issue_number, {
        status: 'failed',
        githubError: 'Build failed — see GitHub Actions logs',
      })
      break

    case 'blocked':
      await updateBuildTicketByIssue(issue_number, {
        status: 'failed',
        githubError: reason || 'Blocked by safety rules',
      })
      break
  }

  return NextResponse.json({ handled: true })
}

async function updateBuildTicketByIssue(issueNumber: number, data: any) {
  await prisma.buildTicket.updateMany({
    where: { githubIssueNumber: issueNumber },
    data: { ...data, updatedAt: new Date() },
  }).catch(e => console.error('[Webhook] BuildTicket update error:', e))
}
