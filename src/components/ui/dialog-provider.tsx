"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogConfig {
  title: string;
  description: string;
  type: "alert" | "confirm";
  variant: "info" | "warning" | "destructive" | "success";
  confirmText: string;
  cancelText: string;
  resolve: (value: boolean) => void;
}

interface DialogContextProps {
  alert: (options: {
    title: string;
    description: string;
    variant?: "info" | "warning" | "destructive" | "success";
    confirmText?: string;
  }) => Promise<void>;
  confirm: (options: {
    title: string;
    description: string;
    variant?: "info" | "warning" | "destructive" | "success";
    confirmText?: string;
    cancelText?: string;
  }) => Promise<boolean>;
}

const DialogContext = React.createContext<DialogContextProps | null>(null);

export function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<DialogConfig | null>(null);

  const alert = React.useCallback(
    ({
      title,
      description,
      variant = "info",
      confirmText = "OK",
    }: {
      title: string;
      description: string;
      variant?: "info" | "warning" | "destructive" | "success";
      confirmText?: string;
    }) => {
      return new Promise<void>((resolve) => {
        setConfig({
          title,
          description,
          type: "alert",
          variant,
          confirmText,
          cancelText: "",
          resolve: () => {
            setConfig(null);
            resolve();
          },
        });
      });
    },
    []
  );

  const confirm = React.useCallback(
    ({
      title,
      description,
      variant = "info",
      confirmText = "Confirm",
      cancelText = "Cancel",
    }: {
      title: string;
      description: string;
      variant?: "info" | "warning" | "destructive" | "success";
      confirmText?: string;
      cancelText?: string;
    }) => {
      return new Promise<boolean>((resolve) => {
        setConfig({
          title,
          description,
          type: "confirm",
          variant,
          confirmText,
          cancelText,
          resolve: (val) => {
            setConfig(null);
            resolve(val);
          },
        });
      });
    },
    []
  );

  const getIcon = () => {
    if (!config) return null;
    switch (config.variant) {
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-brand-amber" />;
      case "destructive":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-brand-teal" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-brand-blue" />;
    }
  };

  const getIconBgClass = () => {
    if (!config) return "";
    switch (config.variant) {
      case "warning":
        return "bg-brand-amber/15";
      case "destructive":
        return "bg-destructive/15";
      case "success":
        return "bg-brand-teal/15";
      case "info":
      default:
        return "bg-brand-blue/15";
    }
  };

  const getConfirmButtonClass = () => {
    if (!config) return "";
    switch (config.variant) {
      case "destructive":
        return "bg-destructive text-white hover:bg-destructive/95 hover:shadow-destructive/10";
      case "warning":
        return "bg-brand-amber text-black hover:bg-brand-amber/90";
      case "success":
        return "bg-brand-teal text-white hover:bg-brand-teal/90 hover:shadow-brand-teal/10";
      case "info":
      default:
        return "bg-white text-black hover:bg-white/90";
    }
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      
      <Dialog.Root open={config !== null} onOpenChange={(open) => { if (!open && config) config.resolve(false); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md border border-border bg-card p-6 shadow-2xl rounded-2xl outline-none animate-scale-in" style={{ transform: "translate(-50%, -50%)" }}>
            <div className="flex items-start gap-4">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", getIconBgClass())}>
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <Dialog.Title className="text-base font-semibold text-white mb-2 leading-6">
                  {config?.title}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
                  {config?.description}
                </Dialog.Description>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              {config?.type === "confirm" && (
                <button
                  onClick={() => config.resolve(false)}
                  className="px-4 py-2 border border-border hover:bg-white/5 text-white font-medium rounded-lg text-xs transition-colors cursor-pointer"
                >
                  {config.cancelText}
                </button>
              )}
              <button
                onClick={() => config?.resolve(true)}
                className={cn(
                  "px-4 py-2 font-medium rounded-lg text-xs transition-all shadow-md cursor-pointer",
                  getConfirmButtonClass()
                )}
              >
                {config?.confirmText || "Confirm"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DialogContext.Provider>
  );
}
