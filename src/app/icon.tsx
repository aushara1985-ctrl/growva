import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Favicon matching the in-app wordmark: white rounded square, dark "G".
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAFAFA',
          color: '#09090B',
          fontSize: 22,
          fontWeight: 800,
          borderRadius: 7,
        }}
      >
        G
      </div>
    ),
    { ...size },
  )
}
