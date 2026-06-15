import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 512,
        height: 512,
        background: '#09090b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
      }}
    >
      <span
        style={{
          color: '#f59e0b',
          fontSize: 185,
          fontWeight: 900,
          fontFamily: 'Arial Black, Arial, sans-serif',
          lineHeight: 1,
          letterSpacing: '-4px',
        }}
      >
        FB
      </span>
      <span
        style={{
          color: '#71717a',
          fontSize: 62,
          fontFamily: 'Arial, sans-serif',
          letterSpacing: '6px',
          textTransform: 'uppercase',
        }}
      >
        BARBERS
      </span>
    </div>,
    { width: 512, height: 512 }
  )
}
