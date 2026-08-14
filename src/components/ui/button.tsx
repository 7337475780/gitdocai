"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// Custom GitDoc AI Buttons
export interface GradientButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function GradientButton({ children, className, icon, ...props }: GradientButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative group overflow-hidden rounded-md px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all",
        "bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-teal",
        "inline-flex items-center justify-center gap-2",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {icon && <span className="flex items-center justify-center shrink-0">{icon}</span>}
        {children}
      </span>
    </motion.button>
  );
}

export interface SecondaryButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}

export function SecondaryButton({ children, className, active, ...props }: SecondaryButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, backgroundColor: "var(--color-secondary)" }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors",
        active ? "bg-secondary text-secondary-foreground" : "bg-card text-foreground hover:bg-secondary/50",
        className
      )}
      {...props}
    >
      <span className="flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

export interface IconButtonProps extends HTMLMotionProps<"button"> {
  icon: React.ReactNode;
  className?: string;
  active?: boolean;
}

export function IconButton({ icon, className, active, ...props }: IconButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors shrink-0",
        active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        className
      )}
      {...props}
    >
      <span className="flex items-center justify-center shrink-0">{icon}</span>
    </motion.button>
  );
}

export { Button, buttonVariants };
