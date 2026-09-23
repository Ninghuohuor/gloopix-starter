"use client";

import { cn } from "@/lib/utils";

export function Switch({ checked, onCheckedChange, disabled = false, label, className }: { checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; label: string; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-11 w-[51px] shrink-0 cursor-pointer touch-manipulation items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-[31px] w-[51px] rounded-full transition-colors duration-200 ease-out motion-reduce:transition-none",
          checked ? "bg-switch-on" : "bg-switch-off",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-[27px] w-[27px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.28)] transition-transform duration-200 ease-out motion-reduce:transition-none",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
