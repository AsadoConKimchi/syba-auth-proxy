const SENTRY_API = 'https://sentry.io/api/0';
const SENTRY_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const SENTRY_ORG = process.env.SENTRY_ORG;
const SENTRY_PROJECT = process.env.SENTRY_PROJECT;

interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  count: string;
  firstSeen: string;
  lastSeen: string;
  level: string;
  status: string;
}

interface SentryStat {
  ts: number;
  total: number;
}

async function sentryFetch<T>(path: string): Promise<T | null> {
  if (!SENTRY_TOKEN || !SENTRY_ORG || !SENTRY_PROJECT) return null;
  try {
    const res = await fetch(`${SENTRY_API}${path}`, {
      headers: { Authorization: `Bearer ${SENTRY_TOKEN}` },
      next: { revalidate: 300 }, // 5분 캐시
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function MetricCard({ title, value, sub, color }: { title: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className={`text-3xl font-bold ${color || ''}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function levelColor(level: string): string {
  switch (level) {
    case 'fatal': return 'bg-red-600 text-white';
    case 'error': return 'bg-red-100 text-red-800';
    case 'warning': return 'bg-yellow-100 text-yellow-800';
    case 'info': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default async function SentryPage() {
  if (!SENTRY_TOKEN || !SENTRY_ORG || !SENTRY_PROJECT) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">에러 모니터링</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-lg font-semibold text-yellow-800 mb-2">Sentry 설정 필요</p>
          <p className="text-sm text-yellow-700 mb-4">
            환경변수를 설정해주세요:
          </p>
          <code className="block bg-yellow-100 rounded p-3 text-left text-xs text-yellow-900">
            SENTRY_AUTH_TOKEN=&lt;Sentry API 토큰&gt;<br />
            SENTRY_ORG=&lt;organization slug&gt;<br />
            SENTRY_PROJECT=&lt;project slug&gt;
          </code>
          <p className="text-xs text-yellow-600 mt-3">
            Sentry → Settings → API Keys에서 토큰을 생성할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  const projectPath = `/projects/${SENTRY_ORG}/${SENTRY_PROJECT}`;

  // 미해결 이슈 목록
  const issues = await sentryFetch<SentryIssue[]>(
    `${projectPath}/issues/?query=is:unresolved&sort=date&limit=10`
  );

  // 최근 24시간 이벤트 통계
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;
  const stats = await sentryFetch<SentryStat[][]>(
    `${projectPath}/stats/?stat=received&since=${dayAgo}&until=${now}&resolution=1h`
  );

  const unresolvedCount = issues?.length ?? 0;
  const totalEvents24h = stats?.[0]?.reduce((sum, s) => sum + s.total, 0) ?? (stats as unknown as SentryStat[])?.reduce((sum: number, s: SentryStat) => sum + s.total, 0) ?? 0;

  // 레벨별 분류
  const errorCount = issues?.filter(i => i.level === 'error' || i.level === 'fatal').length ?? 0;
  const warningCount = issues?.filter(i => i.level === 'warning').length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">에러 모니터링</h1>
        <a
          href={`https://sentry.io/organizations/${SENTRY_ORG}/issues/?project=${SENTRY_PROJECT}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-orange-500 hover:text-orange-600 font-medium"
        >
          Sentry 열기 →
        </a>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="미해결 이슈"
          value={unresolvedCount}
          color={unresolvedCount > 0 ? 'text-red-600' : 'text-green-600'}
        />
        <MetricCard
          title="24시간 이벤트"
          value={totalEvents24h}
          sub="수신된 에러 이벤트 수"
        />
        <MetricCard
          title="에러/치명적"
          value={errorCount}
          color={errorCount > 0 ? 'text-red-500' : 'text-gray-400'}
        />
        <MetricCard
          title="경고"
          value={warningCount}
          color={warningCount > 0 ? 'text-yellow-500' : 'text-gray-400'}
        />
      </div>

      {/* 미해결 이슈 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">미해결 이슈</h2>
        </div>

        {!issues || issues.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-medium">미해결 이슈가 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {issues.map((issue) => (
              <a
                key={issue.id}
                href={`https://sentry.io/organizations/${SENTRY_ORG}/issues/${issue.id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${levelColor(issue.level)}`}>
                        {issue.level}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {issue.title}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{issue.culprit}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-bold text-gray-700">
                      {Number(issue.count).toLocaleString()}회
                    </p>
                    <p className="text-xs text-gray-400">{timeAgo(issue.lastSeen)}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
