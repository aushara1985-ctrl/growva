'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TEMPLATES, ExperimentTemplate } from '@/lib/templates'

const CATEGORY_LABELS: Record<string, string> = {
  saas_b2b: 'SaaS B2B',
  saas_b2c: 'SaaS B2C',
  marketplace: 'Marketplace',
  content: 'Content',
  ecommerce: 'E-commerce',
  service: 'Service',
}

const TYPE_COLORS: Record<string, string> = {
  LANDING_PAGE: '#2563eb',
  PRICING_TEST: '#16a34a',
  OFFER_TEST: '#d97706',
  CONTENT_ANGLE: '#7c3aed',
  AD_COPY: '#dc2626',
}

export default function TemplatesPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('all')
  const [selected, setSelected] = useState<ExperimentTemplate | null>(null)

  const filtered = filter === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category.includes(filter as any))

  const categories = ['all', 'saas_b2b', 'saas_b2c', 'marketplace', 'service', 'ecommerce']

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: 'none', fontSize: 13, color: '#999', cursor: 'pointer' }}>← Dashboard</button>
        <span style={{ color: '#e8e8e8' }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a' }}>Experiment Templates</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#bbb' }}>{TEMPLATES.length} templates</span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 24 }}>

        <div>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {categories.map(c => (
              <button key={c} onClick={() => setFilter(c)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: filter === c ? 600 : 400, background: filter === c ? '#0a0a0a' : '#fff', color: filter === c ? '#fff' : '#666', border: `1px solid ${filter === c ? '#0a0a0a' : '#e8e8e8'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                {c === 'all' ? `All (${TEMPLATES.length})` : `${CATEGORY_LABELS[c]} (${TEMPLATES.filter(t => t.category.includes(c as any)).length})`}
              </button>
            ))}
          </div>

          {/* Templates grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filtered.map(t => (
              <div
                key={t.id}
                onClick={() => setSelected(selected?.id === t.id ? null : t)}
                style={{
                  background: '#fff',
                  border: `1px solid ${selected?.id === t.id ? '#0a0a0a' : '#e8e8e8'}`,
                  borderRadius: 10,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (selected?.id !== t.id) e.currentTarget.style.borderColor = '#ccc' }}
                onMouseLeave={e => { if (selected?.id !== t.id) e.currentTarget.style.borderColor = '#e8e8e8' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#0a0a0a' }}>{t.name}</div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: `${TYPE_COLORS[t.type]}15`, color: TYPE_COLORS[t.type], flexShrink: 0 }}>
                    {t.type.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5, marginBottom: 12 }}>{t.hypothesis}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {t.tags.slice(0, 3).map(tag => (
                      <span key={tag} style={{ fontSize: 10, padding: '2px 7px', background: '#f5f5f5', borderRadius: 4, color: '#888' }}>{tag}</span>
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>{t.avgConversionRate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ position: 'sticky', top: 72, alignSelf: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0a0a0a' }}>{selected.name}</div>
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{selected.whenToUse}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', fontSize: 18, color: '#ccc', cursor: 'pointer' }}>×</button>
              </div>

              <div style={{ padding: '16px 20px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>

                {[
                  { label: 'Headline formula', val: selected.headlineFormula },
                  { label: 'Copy formula', val: selected.copyFormula },
                  { label: 'CTA formula', val: selected.ctaFormula },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#bbb', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{f.label}</div>
                    <div style={{ fontSize: 13, color: '#333', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 7, padding: '10px 12px', lineHeight: 1.5 }}>{f.val}</div>
                  </div>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#bbb', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Channel</div>
                    <div style={{ fontSize: 12, color: '#555' }}>{selected.channel}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#bbb', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>Avg. Conv.</div>
                    <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{selected.avgConversionRate}</div>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#15803d', marginBottom: 4 }}>✓ Scale when</div>
                  <div style={{ fontSize: 12, color: '#166534' }}>{selected.successCondition}</div>
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>✕ Kill when</div>
                  <div style={{ fontSize: 12, color: '#991b1b' }}>{selected.failCondition}</div>
                </div>

                <button
                  onClick={() => router.push(`/dashboard`)}
                  style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Use this template →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
