"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Monitor,
  GitBranch,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Settings,
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
  status: string;
}

interface AppInfo {
  version: string;
  environment: string;
  capabilities: string[];
  githubIntegration: string;
}

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // States
  const [githubState, setGithubState] = React.useState<{
    connected: boolean;
    configured: boolean;
    user: { name: string; login: string; avatarUrl?: string; email?: string } | null;
  }>({
    connected: false,
    configured: false,
    user: null,
  });

  const [settingsData, setSettingsData] = React.useState<{
    appInfo: AppInfo | null;
    providers: Provider[];
  }>({
    appInfo: null,
    providers: [],
  });

  const [isLoading, setIsLoading] = React.useState(true);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Set mounted on client to prevent hydration mismatch for theme buttons
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const loadSettingsAndGithub = React.useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [ghRes, setRes] = await Promise.all([
        fetch("/api/github/status"),
        fetch("/api/settings"),
      ]);
      const ghJson = await ghRes.json();
      const setJson = await setRes.json();

      if (ghJson.success) {
        setGithubState(ghJson.data);
      }
      if (setJson.success) {
        setSettingsData(setJson.data);
      } else {
        setErrorMsg("Failed to load application settings.");
      }
    } catch {
      setErrorMsg("A network error occurred while loading settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettingsAndGithub();
  }, [loadSettingsAndGithub]);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/github/disconnect", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setGithubState({
          connected: false,
          configured: githubState.configured,
          user: null,
        });
      } else {
        setErrorMsg("Failed to disconnect GitHub account.");
      }
    } catch {
      setErrorMsg("A network error occurred during disconnection.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleConnect = () => {
    window.location.href = "/api/github/connect?returnTo=/settings";
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 text-brand-cyan animate-spin mb-4" />
        <p className="text-sm text-muted-foreground font-medium">Loading settings panels...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Settings className="h-8 w-8 text-brand-cyan" />
        <div>
          <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl tracking-tight">
            Settings
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure your client workspace, review integration parameters, and check service statuses.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Action Failed</h3>
              <p className="mt-1 text-sm text-muted-foreground">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Section 1: Appearance */}
        <div className="bg-card/45 border border-border rounded-xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-bold text-foreground mb-1">Appearance</h3>
          <p className="text-xs text-muted-foreground mb-6">
            Customize how GitDoc AI looks on your screen. Switch between light, dark, or system preference modes.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md">
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all focus-ring ${
                mounted && theme === "light"
                  ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                  : "border-border bg-background/55 hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Light mode"
            >
              <Sun className="h-5 w-5" />
              Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all focus-ring ${
                mounted && theme === "dark"
                  ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                  : "border-border bg-background/55 hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Dark mode"
            >
              <Moon className="h-5 w-5" />
              Dark
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border text-sm font-semibold transition-all focus-ring ${
                mounted && theme === "system"
                  ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                  : "border-border bg-background/55 hover:bg-secondary text-muted-foreground hover:text-foreground"
              }`}
              aria-label="System preference"
            >
              <Monitor className="h-5 w-5" />
              System
            </button>
          </div>
        </div>

        {/* Section 2: GitHub Connection */}
        <div className="bg-card/45 border border-border rounded-xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-bold text-foreground mb-1">GitHub Integration</h3>
          <p className="text-xs text-muted-foreground mb-6">
            Review your GitHub account status. Connecting allows saving generated markdown files directly back to repository branches.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-background/25">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-secondary/60 border border-border flex items-center justify-center shrink-0">
                <GitBranch className="h-6 w-6 text-brand-cyan" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Status:</span>
                  {githubState.connected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Connected
                    </span>
                  ) : !githubState.configured ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                      <XCircle className="h-3.5 w-3.5" />
                      OAuth Not Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-amber">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Not Connected
                    </span>
                  )}
                </div>

                {githubState.connected && githubState.user && (
                  <div className="mt-1 flex items-center gap-2">
                    {githubState.user.avatarUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={githubState.user.avatarUrl}
                        alt={githubState.user.name}
                        className="h-5 w-5 rounded-full border border-border"
                      />
                    )}
                    <span className="text-xs text-muted-foreground">
                      Logged in as <strong className="text-foreground">{githubState.user.name} ({githubState.user.login})</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {githubState.connected ? (
                <>
                  <button
                    onClick={handleConnect}
                    className="h-10 px-4 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold text-foreground transition-colors focus-ring"
                  >
                    Reconnect
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="h-10 px-4 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-xs font-semibold text-destructive transition-colors focus-ring"
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleConnect}
                  className="h-10 px-5 rounded-lg bg-brand-cyan hover:opacity-90 text-xs font-bold text-black transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-cyan/15 focus-ring"
                  disabled={!githubState.configured}
                >
                  Connect GitHub Account
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: AI Providers */}
        <div className="bg-card/45 border border-border rounded-xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-bold text-foreground mb-1">AI Provider Availability</h3>
          <p className="text-xs text-muted-foreground mb-6">
            Provider configurations are managed securely via server environment variables. API keys and credentials are never exposed to the client browser.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settingsData.providers.map((p) => {
              const isConfigured = p.status === "Configured";
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-border bg-background/25 flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-semibold text-foreground block">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mt-0.5">
                      Endpoint: Standard SDK
                    </span>
                  </div>
                  <div>
                    {isConfigured ? (
                      <span className="px-2 py-0.5 rounded bg-brand-teal/10 border border-brand-teal/20 text-[10px] font-semibold text-brand-teal uppercase tracking-wider">
                        Available
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-secondary/50 border border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Not Configured
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4: Application Information */}
        <div className="bg-card/45 border border-border rounded-xl p-6 backdrop-blur-md">
          <h3 className="text-lg font-bold text-foreground mb-1">Application Information</h3>
          <p className="text-xs text-muted-foreground mb-6">
            Review capabilities, deployment status, and the current code version of this GitDoc AI workspace.
          </p>

          {settingsData.appInfo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <span className="text-xs text-muted-foreground block">App Version</span>
                  <span className="text-sm font-semibold text-foreground">{settingsData.appInfo.version}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Environment Mode</span>
                  <span className="text-sm font-semibold text-foreground capitalize">
                    {settingsData.appInfo.environment}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block mb-2">Supported Document Architectures</span>
                <div className="flex flex-wrap gap-1.5">
                  {settingsData.appInfo.capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-secondary/40 border border-border text-xs text-muted-foreground"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
