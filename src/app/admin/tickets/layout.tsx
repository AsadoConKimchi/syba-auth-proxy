import { requireAuth } from '@/lib/auth';
import AdminLayout from '@/components/AdminLayout';

export default async function TicketsLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <AdminLayout>{children}</AdminLayout>;
}
