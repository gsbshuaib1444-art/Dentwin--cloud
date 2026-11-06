import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'DENTWIN | My Bright Smile',
  description: 'Child-friendly dental education dashboard'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
