import RequireAuth from '@/components/RequireAuth';
import PaymentsSidebarShell from '@/components/navigation/PaymentsSidebarShell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PaymentsSidebarShell>
      <RequireAuth>{children}</RequireAuth>
    </PaymentsSidebarShell>
  );
}
