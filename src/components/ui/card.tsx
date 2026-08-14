"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: React.ReactNode;
  className?: string;
  glow?: boolean;
  variant?: "flat" | "elevated" | "featured" | "glass";
}

export function GlassCard({ children, className, glow = false, variant = "glass", ...props }: GlassCardProps) {
  const variantClasses = {
    glass: "rounded-xl border border-white/10 dark:border-white/5 bg-card/50 backdrop-blur-xl shadow-lg",
    flat: "bg-secondary/30 border border-border/40 rounded-md shadow-none",
    elevated: "bg-card border border-border rounded-lg shadow-sm hover:shadow-md",
    featured: "bg-card border border-brand-coral/30 rounded-lg shadow-md before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-brand-coral before:to-brand-violet",
  };

  return (
    <motion.div
      whileHover={glow ? { y: -1, transition: { duration: 0.2 } } : undefined}
      className={cn(
        "relative overflow-hidden p-6 transition-all duration-300",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {variant === "glass" && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export interface MetricCardProps extends GlassCardProps {
  title: string;
  value: string | React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  iconColorClass?: string;
}

export function MetricCard({ title, value, trend, icon, iconColorClass, className, ...props }: MetricCardProps) {
  return (
    <GlassCard className={cn("flex flex-col gap-4", className)} glow {...props}>
      <div className="flex items-center gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg bg-background/50 border border-white/5", iconColorClass)}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className={trend.isPositive ? "text-brand-teal" : "text-destructive"}>
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </span>
          <span className="text-muted-foreground">from last month</span>
        </div>
      )}
    </GlassCard>
  );
}

export interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "info" | "default";
  className?: string;
}

export function StatusBadge({ children, variant = "default", className }: StatusBadgeProps) {
  const variants = {
    success: "bg-brand-teal/10 text-brand-teal border-brand-teal/20",
    warning: "bg-brand-amber/10 text-brand-amber border-brand-amber/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
    default: "bg-secondary text-secondary-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
