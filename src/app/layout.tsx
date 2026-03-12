import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SYBA Admin',
  description: 'SYBA 관리자 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
