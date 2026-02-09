import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
        }}
      >
        <span style={{ color: '#00ff41', fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }}>
          H
        </span>
      </div>
    ),
    { ...size },
  );
}
