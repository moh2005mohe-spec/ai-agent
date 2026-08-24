import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aider Web UI — BYOK AI Coding Agent',
  description:
    'A self-hosted web interface for the Aider AI coding agent. Bring your own API key — zero token costs for the server.',
  openGraph: {
    title: 'Aider Web UI',
    description: 'BYOK AI coding agent powered by Aider.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
