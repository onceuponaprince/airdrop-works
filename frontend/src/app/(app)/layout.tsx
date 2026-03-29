'use client';

import { AppSidebar } from '@/components/app/AppSidebar';
import { AppTopbar } from '@/components/app/AppTopbar';
import { AuthGuard } from '@/components/shared/AuthGuard';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[--background]">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AppTopbar />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
