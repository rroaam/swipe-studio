import './globals.css';
import { Hanken_Grotesk } from 'next/font/google';

const hanken = Hanken_Grotesk({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'r0am — Swipe Pipeline',
  description: 'Fetch, remix, review and re-render ROAM swipe decks.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={hanken.className}>
      <body>{children}</body>
    </html>
  );
}
