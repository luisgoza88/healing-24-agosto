import DashboardClient from './DashboardClient';
import CommandPalette from '@/components/CommandPalette'
import PageTransition from '@/components/PageTransition'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CommandPalette />
      <DashboardClient>
        <PageTransition>
          {children}
        </PageTransition>
      </DashboardClient>
    </>
  );
}