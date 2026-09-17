import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

// Primary is ink, not the accent. Solid black on warm paper is the whole
// editorial register; clay is a highlight colour and loses its force the moment
// it is used for every button on the page.
const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink-900 text-ink-50 hover:bg-ink-800 dark:bg-ink-50 dark:text-ink-950 dark:hover:bg-white active:scale-[0.98]",
  secondary:
    "bg-clay-600 text-white hover:bg-clay-500 active:scale-[0.98]",
  outline: "surface hover:bg-[var(--bg-subtle)] active:scale-[0.98]",
  ghost: "hover:bg-[var(--bg-subtle)] text-muted hover:text-[var(--fg)]",
  danger: "bg-red-700 text-white hover:bg-red-600 active:scale-[0.98]",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface rounded-xl", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 p-5 pb-3", className)}>
      <div className="min-w-0">
        <h2 className="font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

const fieldBase =
  "w-full rounded-lg surface px-3 py-2 text-sm placeholder:text-ink-400 focus:border-clay-500 transition-colors";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />;
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldBase, "resize-y leading-relaxed", className)}
      {...props}
    />
  );
});

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldBase, "h-10 pr-8", className)} {...props} />;
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "brand" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "bg-[var(--bg-subtle)] text-muted border",
    brand: "bg-clay-500/10 text-clay-500 border border-clay-500/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon ? <div className="text-ink-400">{icon}</div> : null}
      <div>
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-clay-500/8 border-clay-500/25 text-clay-700 dark:text-clay-300",
    warning: "bg-amber-500/8 border-amber-500/25 text-amber-700 dark:text-amber-300",
    danger: "bg-red-500/8 border-red-500/25 text-red-700 dark:text-red-300",
    success: "bg-emerald-500/8 border-emerald-500/25 text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone], className)}>
      {children}
    </div>
  );
}
