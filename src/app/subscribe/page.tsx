'use client';

import { useEffect, useRef } from 'react';

// 기존 subscribe.html을 iframe으로 감싸기 — 인라인 JS가 674줄이라 변환 대신 정적 HTML 유지
export default function SubscribePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 기존 subscribe.html의 전체 콘텐츠를 그대로 렌더링
    if (containerRef.current) {
      const iframe = document.createElement('iframe');
      // 현재 페이지의 query string을 iframe에 전달 (uid 등)
      iframe.src = `/subscribe.html${window.location.search}`;
      iframe.style.width = '100%';
      iframe.style.height = '100vh';
      iframe.style.border = 'none';
      iframe.style.backgroundColor = '#0A0A0A';
      containerRef.current.appendChild(iframe);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh', backgroundColor: '#0A0A0A' }}
    />
  );
}
