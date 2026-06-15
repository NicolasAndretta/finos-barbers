import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  const dim = 180
  const fontSize = Math.round(dim * 0.36)
  const subSize = Math.round(dim * 0.13)

  return new ImageResponse(
    <div
      style={{
        width: dim,
        height: dim,
        background: '#09090b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Math.round(dim * 0.04),
      }}
    >
      <span
        style={{
          color: '#f59e0b',
          fontSize,
          fontWeight: 900,
          fontFamily: 'Arial Black, Arial, sans-serif',
          lineHeight: 1,
          letterSpacing: '-2px',
        }}
      >
        FB
      </span>
      <span
        style={{
          color: '#a1a1aa',
          fontSize: subSize,
          fontFamily: 'Arial, sans-serif',
          letterSpacing: '3px',
          textTransform: 'uppercase',
        }}
      >
        BARBERS
      </span>
    </div>,
    { width: dim, height: dim }
  )
}
