import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Keepmore',
  description: 'Find out how much you\'re overpaying Stripe',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}