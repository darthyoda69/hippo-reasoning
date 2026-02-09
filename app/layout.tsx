import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://hippo-reasoning.vercel.app'),
  title: 'hippo // agent reliability infrastructure',
  description: 'Open-source reasoning memory, trace replay, and regression gates for Vercel AI SDK agents. CI/CD for agent behavior.',
  openGraph: {
    title: 'hippo // agent CI/CD',
    description: 'Reasoning memory. Trace replay. Regression gates. The CI/CD layer for agent behavior.',
    type: 'website',
    url: 'https://hippo-reasoning.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'hippo // agent CI/CD',
    description: 'Reasoning memory. Trace replay. Regression gates. The CI/CD layer for agent behavior.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-[#b0b0b0] antialiased">
        {children}
      </body>
    </html>
  );
}
