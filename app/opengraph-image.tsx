import { ImageResponse } from 'next/og';

export const alt = 'hippo — agent reliability infrastructure';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <span style={{ color: '#00ff41', fontSize: 72, fontWeight: 700 }}>hippo</span>
          <span style={{ color: '#404040', fontSize: 72 }}>//</span>
        </div>
        <div style={{ color: '#606060', fontSize: 32, marginBottom: '48px' }}>
          agent reliability infrastructure
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            color: '#00ff41',
            fontSize: 28,
          }}
        >
          <span>{'>'} reasoning memory</span>
          <span>{'>'} trace replay</span>
          <span>{'>'} regression gates</span>
        </div>
        <div style={{ color: '#333', fontSize: 20, marginTop: '48px' }}>
          open-source &middot; vercel ai sdk v4 &middot; MIT license
        </div>
      </div>
    ),
    { ...size },
  );
}
