import { redirect } from 'next/navigation';

// 루트 페이지는 LNURL 콜백용 — 브라우저 직접 접근 시 admin으로 리다이렉트
export default function RootPage() {
  redirect('/admin');
}
