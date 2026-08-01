'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle2, CircleAlert, Loader2, GitCommitHorizontal, ExternalLink } from 'lucide-react';
import { GithubIcon } from '@/components/ui/icons';

interface GitHubCommitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
}

export function GitHubCommitModal({ open, onOpenChange, documentId }: GitHubCommitModalProps) {
  const [repositories, setRepositories] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [filePath, setFilePath] = useState('README.md');
  const [commitMessage, setCommitMessage] = useState('docs: update README with GitDoc AI');
  
  const [fileStatus, setFileStatus] = useState<'create' | 'update' | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [committing, setCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<{ commitUrl: string; fileUrl: string } | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Reset state on open
      setCommitSuccess(null);
      setCommitError(null);
      setRepositories([]);
      setSelectedRepo('');
      setSelectedBranch('');
      fetchRepositories();
    }
  }, [open]);

  useEffect(() => {
    if (selectedRepo) {
      const [owner, name] = selectedRepo.split('/');
      fetchBranches(owner, name);
    } else {
      setBranches([]);
      setSelectedBranch('');
    }
  }, [selectedRepo]);

  useEffect(() => {
    if (selectedRepo && selectedBranch && filePath) {
      checkFileStatus();
    } else {
      setFileStatus(null);
    }
  }, [selectedRepo, selectedBranch, filePath]);

  const fetchRepositories = async () => {
    setLoadingRepos(true);
    setRepoError(null);
    try {
      const res = await fetch('/api/github/repositories');
      const data = await res.json();
      if (data.success) {
        setRepositories(data.data.repositories);
        if (data.data.repositories.length > 0) {
          setSelectedRepo(data.data.repositories[0].fullName);
        }
      } else {
        setRepoError(data.error);
      }
    } catch (e) {
      setRepoError('Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  const fetchBranches = async (owner: string, repo: string) => {
    setLoadingBranches(true);
    try {
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/branches`);
      const data = await res.json();
      if (data.success) {
        setBranches(data.data.branches);
        const repoData = repositories.find(r => r.fullName === `${owner}/${repo}`);
        if (repoData && data.data.branches.some((b: any) => b.name === repoData.defaultBranch)) {
          setSelectedBranch(repoData.defaultBranch);
        } else if (data.data.branches.length > 0) {
          setSelectedBranch(data.data.branches[0].name);
        }
      }
    } catch (e) {
      // Handle error
    } finally {
      setLoadingBranches(false);
    }
  };

  const checkFileStatus = async () => {
    if (!selectedRepo || !selectedBranch || !filePath) return;
    setLoadingStatus(true);
    try {
      const [owner, repo] = selectedRepo.split('/');
      const params = new URLSearchParams({ path: filePath, branch: selectedBranch });
      const res = await fetch(`/api/github/repositories/${owner}/${repo}/file-status?${params}`);
      const data = await res.json();
      if (data.success) {
        setFileStatus(data.data.exists ? 'update' : 'create');
      } else {
        setFileStatus(null);
      }
    } catch (e) {
      setFileStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleCommit = async () => {
    if (!selectedRepo || !selectedBranch || !filePath || !commitMessage) return;
    
    setCommitting(true);
    setCommitError(null);
    try {
      const [owner, name] = selectedRepo.split('/');
      const res = await fetch('/api/github/commit-readme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          repository: { owner, name },
          branch: selectedBranch,
          path: filePath,
          message: commitMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCommitSuccess(data.data);
      } else {
        setCommitError(data.error);
      }
    } catch (e) {
      setCommitError('An unexpected error occurred while committing.');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-card p-6 shadow-2xl rounded-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              <GithubIcon className="w-5 h-5" />
              Commit README to GitHub
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-1.5 opacity-70 transition-opacity hover:opacity-100 hover:bg-white/10 outline-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          
          <Dialog.Description className="text-sm text-muted-foreground mb-6">
            Select where you want to create or update this README.
          </Dialog.Description>

          {commitSuccess ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">README committed successfully</h3>
                  <p className="text-sm text-muted-foreground">Your changes are now live on GitHub.</p>
                </div>
              </div>
              
              <div className="grid gap-2">
                <a 
                  href={commitSuccess.commitUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  <GitCommitHorizontal className="w-4 h-4" />
                  View Commit
                  <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                </a>
                <a 
                  href={commitSuccess.fileUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-transparent border border-border hover:bg-white/5 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  <GithubIcon className="w-4 h-4" />
                  View Repository
                  <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                </a>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Repository</label>
                <div className="relative">
                  <select 
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    disabled={loadingRepos || repositories.length === 0}
                    className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 disabled:opacity-50"
                  >
                    {loadingRepos ? (
                      <option>Loading repositories...</option>
                    ) : repositories.length === 0 ? (
                      <option>No repositories found</option>
                    ) : (
                      repositories.map(repo => (
                        <option key={repo.fullName} value={repo.fullName}>
                          {repo.fullName} {repo.private ? '(Private)' : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {repoError && <p className="text-xs text-red-400 mt-1">{repoError}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Branch</label>
                <select 
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={loadingBranches || branches.length === 0}
                  className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 disabled:opacity-50"
                >
                  {loadingBranches ? (
                    <option>Loading branches...</option>
                  ) : branches.length === 0 ? (
                    <option>No branches available</option>
                  ) : (
                    branches.map(branch => (
                      <option key={branch.name} value={branch.name}>{branch.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">File Path</label>
                <input 
                  type="text" 
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="README.md"
                  className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Commit Message</label>
                <input 
                  type="text" 
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/50"
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/5 rounded-lg">
                  {loadingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <GitCommitHorizontal className="w-4 h-4 text-brand-cyan" />
                  )}
                  <div className="text-sm flex-1">
                    {loadingStatus ? (
                      <span className="text-muted-foreground">Checking status...</span>
                    ) : fileStatus === 'update' ? (
                      <span className="text-white font-medium">Update <span className="text-brand-cyan">{filePath}</span></span>
                    ) : fileStatus === 'create' ? (
                      <span className="text-white font-medium">Create <span className="text-brand-cyan">{filePath}</span></span>
                    ) : (
                      <span className="text-muted-foreground">Waiting for valid path...</span>
                    )}
                  </div>
                </div>
              </div>

              {commitError && (
                <div className="p-3 bg-brand-amber/10 border border-brand-amber/20 rounded-lg flex gap-2 items-start text-brand-amber text-sm">
                  <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{commitError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={committing}
                  className="flex-1 px-4 py-2 bg-transparent border border-border hover:bg-white/5 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommit}
                  disabled={committing || loadingStatus || !fileStatus || !commitMessage}
                  className="flex-1 px-4 py-2 bg-white text-black hover:bg-white/90 font-medium rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Commit README
                </button>
              </div>
            </div>
          )}

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
