import AdminLayout from '@/components/AdminLayout';
import { requireAuth } from '@/lib/auth';

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();

  return <AdminLayout>{children}</AdminLayout>;
}
