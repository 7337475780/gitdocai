"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
}

export function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  className,
  align = "start"
}: CustomSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className={cn("flex h-10 w-full items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-foreground focus-ring text-left transition-all hover:bg-secondary/30", className)}>
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content 
          className="z-50 min-w-[200px] max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-1 text-card-foreground shadow-xl animate-in fade-in-0 zoom-in-95 custom-scrollbar" 
          align={align} 
          sideOffset={4}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-xs rounded-lg text-left transition-colors truncate cursor-pointer",
                opt.value === value 
                  ? "bg-brand-cyan/10 text-brand-cyan font-semibold" 
                  : "text-foreground hover:bg-secondary/60"
              )}
            >
              {opt.label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
