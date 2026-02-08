import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hippo Reasoning — Agent Reliability Infrastructure for Vercel AI SDK',
  description: 'Open-source reasoning memory, trace replay, and regression gates for Vercel AI SDK agents. CI/CD for agent behavior.',
  openGraph: {
    title: 'Hippo Reasoning',
    description: 'Agent reliability infrastructure for Vercel AI SDK — reasoning memory, replay, regression gates',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0a] text-[#ededed] antialiased">
        {children}
      </body>
    </html>
  );
}
