import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        hippo: {
          bg: '#0a0a0a',
          card: '#111111',
          border: '#1e1e1e',
          text: '#ededed',
          muted: '#888888',
          accent: '#00d4ff',
          success: '#00ff88',
          warning: '#ffaa00',
          error: '#ff4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
