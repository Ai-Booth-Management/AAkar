import { redirect } from 'next/navigation';
import { getUser } from '@/lib/boothman/auth';
import { Sidebar } from '@/components/boothman/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  
  if (!user) {
    redirect('/boothman');
  }

  return (
    <div className="app">
      <Sidebar role={user.role as any} />
      <main className="main">
        {children}
      </main>
    </div>
  );
}
