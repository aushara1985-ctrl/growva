import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Growva — Decision infrastructure for solo founders'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Brand-matched share card (dark surface, verdict-style accent). No external
// font fetch — uses the platform default so it renders reliably at build time.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#09090B',
          padding: '72px 80px',
          color: '#FAFAFA',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#FAFAFA',
              color: '#09090B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            G
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>Growva</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#EF4444' }} />
            <div style={{ fontSize: 22, fontWeight: 700, color: '#F87171', letterSpacing: 2 }}>
              STOP · CONTINUE · SCALE
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 60,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            <div>Turn growth experiments</div>
            <div>into clear decisions.</div>
          </div>
        </div>

        <div style={{ fontSize: 26, color: '#A1A1AA' }}>
          Decision infrastructure for solo founders — real signals, not gut feeling.
        </div>
      </div>
    ),
    { ...size },
  )
}
