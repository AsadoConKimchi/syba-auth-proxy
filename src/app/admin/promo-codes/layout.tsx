import { requireAuth } from '@/lib/auth';
import AdminLayout from '@/components/AdminLayout';

export default async function PromoCodesLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <AdminLayout>{children}</AdminLayout>;
}
