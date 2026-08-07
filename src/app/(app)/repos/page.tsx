import { GitHubRepositoriesView } from '@/components/github/github-repositories-view';

export const metadata = {
  title: 'GitHub Repositories — GitDoc AI',
  description: 'Manage, search, and analyze your public and private GitHub repositories.',
};

export default function GitHubRepositoriesPage() {
  return <GitHubRepositoriesView />;
}
