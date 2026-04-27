'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Assets {
  landingPage: {
    headline: string
    subheadline: string
    bodySection1: string
    bodySection2: string
    cta: string
    socialProof: string
    urgencyLine: string
    htmlTemplate: string
  }
  ads: Array<{ platform: string; headline: string; body: string; cta: string; hook: string }>
  hooks: string[]
  campaignKit: {
    emailSubject: string
    emailBody: string
    tweetThread: string[]
    linkedinPost: string
    whatsappMessage: string
  }
}

type Tab = 'landing' | 'ads' | 'hooks' | 'campaign'

export default function ExecutePage() {
  const params = useParams()
  const router = useRouter()
  const [assets, setAssets] = useState<Assets | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('landing')
  const [copied, setCopied] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState(false)

  const generate = async () => {
    setLoading(true)
    const res = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experimentId: params.experimentId }),
    })
    const data = await res.json()
    setAssets(data.assets)
    setLoading(false)
  }

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadHtml = () => {
    if (!assets?.landingPage.htmlTemplate) return
    const blob = new Blob([assets.landingPage.htmlTemplate], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'landing-page.html'; a.click()
    URL.revokeObjectURL(url)
  }

  const s = {
    page: { minHeight: '100vh', background: '#fafafa', fontFamily: "'Inter', -apple-system, sans-serif" } as const,
    nav: { background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 12 } as const,
    back: { background: 'transparent', border: 'none', fontSize: 13, color: '#999', cursor: 'pointer', padding: '4px 0' } as const,
    wrap: { maxWidth: 900, margin: '0 auto', padding: '32px 24px' } as const,
    card: { background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden', marginBottom: 16 } as const,
    cardHead: { padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as const,
    label: { fontSize: 11, fontWeight: 600, color: '#999', letterSpacing: 0.5, textTransform: 'uppercase' } as const,
    body: { padding: '20px 24px' } as const,
    field: { marginBottom: 20 } as const,
    fieldLabel: { fontSize: 11, color: '#bbb', fontWeight: 600, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' } as const,
    fieldValue: { fontSize: 14, color: '#333', lineHeight: 1.6, background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '12px 14px', position: 'relative' } as const,
    copyBtn: { fontSize: 11, padding: '4px 10px', background: 'transparent', border: '1px solid #e8e8e8', borderRadius: 5, cursor: 'pointer', color: '#888', marginTop: 6 } as const,
    tabs: { display: 'flex', gap: 2, padding: '0 24px', borderBottom: '1px solid #f0f0f0', background: '#fff' } as const,
    tab: (active: boolean) => ({ padding: '12px 16px', fontSize: 13, cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: active ? '2px solid #0a0a0a' : '2px solid transparent', color: active ? '#0a0a0a' : '#999', fontWeight: active ? 500 : 400, fontFamily: 'inherit', marginBottom: -1 }),
    bigBtn: { background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 15, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' } as const,
    adCard: { background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '16px', marginBottom: 12 } as const,
    platform: { fontSize: 11, fontWeight: 600, color: '#0a0a0a', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10, padding: '3px 8px', background: '#f0f0f0', borderRadius: 4, display: 'inline-block' } as const,
    hook: { background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: '12px 14px', marginBottom: 8, fontSize: 13, color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } as const,
  }

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      <div style={s.nav}>
        <button style={s.back} onClick={() => router.push('/dashboard')}>← Dashboard</button>
        <span style={{ color: '#e8e8e8' }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a' }}>Execution Kit</span>
      </div>

      <div style={s.wrap}>

        {!assets && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#0a0a0a', marginBottom: 12, letterSpacing: -0.5 }}>
              Generate Execution Assets
            </div>
            <p style={{ fontSize: 15, color: '#888', marginBottom: 40, lineHeight: 1.6 }}>
              AI builds a complete campaign kit for this experiment —<br />
              landing page, ads, hooks, and content ready to launch.
            </p>
            <button style={s.bigBtn} onClick={generate} disabled={loading}>
              {loading ? 'Generating assets...' : 'Generate kit →'}
            </button>
            {loading && (
              <p style={{ fontSize: 13, color: '#bbb', marginTop: 20 }}>
                Building landing page, 3 ads, 5 hooks, campaign copy...
              </p>
            )}
          </div>
        )}

        {assets && (
          <>
            {/* Tabs */}
            <div style={s.tabs}>
              {([['landing', 'Landing Page'], ['ads', 'Ads (3)'], ['hooks', 'Hooks (5)'], ['campaign', 'Campaign Kit']] as [Tab, string][]).map(([key, label]) => (
                <button key={key} style={s.tab(activeTab === key)} onClick={() => setActiveTab(key)}>{label}</button>
              ))}
            </div>

            {/* LANDING PAGE */}
            {activeTab === 'landing' && (
              <div style={s.card}>
                <div style={s.cardHead}>
                  <span style={s.label as any}>Landing Page</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={s.copyBtn} onClick={() => setPreviewHtml(!previewHtml)}>
                      {previewHtml ? 'Hide preview' : 'Preview HTML'}
                    </button>
                    <button style={{ ...s.copyBtn, background: '#0a0a0a', color: '#fff', border: 'none' }} onClick={downloadHtml}>
                      ↓ Download HTML
                    </button>
                  </div>
                </div>
                <div style={s.body}>
                  {[
                    { key: 'headline', label: 'Headline' },
                    { key: 'subheadline', label: 'Subheadline' },
                    { key: 'bodySection1', label: 'Problem Section' },
                    { key: 'bodySection2', label: 'Solution Section' },
                    { key: 'cta', label: 'CTA Button' },
                    { key: 'socialProof', label: 'Social Proof' },
                    { key: 'urgencyLine', label: 'Urgency Line' },
                  ].map(f => {
                    const val = (assets.landingPage as any)[f.key]
                    return (
                      <div key={f.key} style={s.field}>
                        <div style={s.fieldLabel as any}>{f.label}</div>
                        <div style={s.fieldValue}>{val}</div>
                        <button style={s.copyBtn} onClick={() => copy(val, f.key)}>
                          {copied === f.key ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )
                  })}

                  {previewHtml && (
                    <div style={{ marginTop: 20 }}>
                      <div style={s.fieldLabel as any}>HTML Preview</div>
                      <iframe
                        srcDoc={assets.landingPage.htmlTemplate}
                        style={{ width: '100%', height: 500, border: '1px solid #e8e8e8', borderRadius: 8 }}
                        title="Landing page preview"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ADS */}
            {activeTab === 'ads' && (
              <div style={s.card}>
                <div style={s.cardHead}>
                  <span style={s.label as any}>Ad Copy — 3 platforms</span>
                </div>
                <div style={s.body}>
                  {assets.ads.map((ad, i) => (
                    <div key={i} style={s.adCard}>
                      <span style={s.platform as any}>{ad.platform}</span>
                      {[
                        { label: 'Hook (first line)', val: ad.hook },
                        { label: 'Headline', val: ad.headline },
                        { label: 'Body', val: ad.body },
                        { label: 'CTA', val: ad.cta },
                      ].map(f => (
                        <div key={f.label} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, color: '#bbb', marginBottom: 4 }}>{f.label}</div>
                          <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{f.val}</div>
                          <button style={s.copyBtn} onClick={() => copy(f.val, `${i}-${f.label}`)}>
                            {copied === `${i}-${f.label}` ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HOOKS */}
            {activeTab === 'hooks' && (
              <div style={s.card}>
                <div style={s.cardHead}>
                  <span style={s.label as any}>Content Hooks</span>
                  <button style={s.copyBtn} onClick={() => copy(assets.hooks.join('\n\n'), 'all-hooks')}>
                    {copied === 'all-hooks' ? '✓ Copied all' : 'Copy all'}
                  </button>
                </div>
                <div style={s.body}>
                  <p style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>Use these as opening lines for posts, reels, or ads.</p>
                  {assets.hooks.map((hook, i) => (
                    <div key={i} style={s.hook}>
                      <span style={{ fontSize: 14, color: '#333', flex: 1 }}>"{hook}"</span>
                      <button style={s.copyBtn} onClick={() => copy(hook, `hook-${i}`)}>
                        {copied === `hook-${i}` ? '✓' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CAMPAIGN KIT */}
            {activeTab === 'campaign' && (
              <div style={s.card}>
                <div style={s.cardHead}>
                  <span style={s.label as any}>Campaign Kit</span>
                </div>
                <div style={s.body}>
                  {[
                    { label: 'Email Subject', val: assets.campaignKit.emailSubject, key: 'email-subj' },
                    { label: 'Email Body', val: assets.campaignKit.emailBody, key: 'email-body' },
                    { label: 'LinkedIn Post', val: assets.campaignKit.linkedinPost, key: 'linkedin' },
                    { label: 'WhatsApp Message', val: assets.campaignKit.whatsappMessage, key: 'whatsapp' },
                  ].map(f => (
                    <div key={f.key} style={s.field}>
                      <div style={s.fieldLabel as any}>{f.label}</div>
                      <div style={{ ...s.fieldValue, whiteSpace: 'pre-wrap' }}>{f.val}</div>
                      <button style={s.copyBtn} onClick={() => copy(f.val, f.key)}>
                        {copied === f.key ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  ))}

                  <div style={s.field}>
                    <div style={s.fieldLabel as any}>Twitter/X Thread</div>
                    {assets.campaignKit.tweetThread.map((tweet, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#ccc', marginBottom: 4 }}>Tweet {i + 1}</div>
                        <div style={{ ...s.fieldValue, whiteSpace: 'pre-wrap' }}>{tweet}</div>
                        <button style={s.copyBtn} onClick={() => copy(tweet, `tweet-${i}`)}>
                          {copied === `tweet-${i}` ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Regenerate */}
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button
                style={{ ...s.copyBtn, padding: '8px 20px', fontSize: 13 }}
                onClick={() => { setAssets(null); generate() }}
              >
                ↻ Regenerate assets
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
