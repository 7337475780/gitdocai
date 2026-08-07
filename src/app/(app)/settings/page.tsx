import { SettingsView } from '@/components/settings/settings-view';

export const metadata = {
  title: 'Settings — GitDoc AI',
  description: 'Manage appearance themes, GitHub connections, and check AI provider configurations.',
};

export default function SettingsPage() {
  return <SettingsView />;
}
