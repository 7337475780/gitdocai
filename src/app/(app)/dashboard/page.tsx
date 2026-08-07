import { DashboardView } from '@/components/dashboard/dashboard-view';

export const metadata = {
  title: 'Dashboard — GitDoc AI',
  description: 'Overview of your repository documentation health, quality, and activity.',
};

export default function DashboardPage() {
  return <DashboardView />;
}
