"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { Info } from "lucide-react";

export function InfoTooltip({ content, label = "查看说明" }: { content: string; label?: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        delay={250}
        closeDelay={100}
        closeOnClick={false}
        aria-label={label}
        className="relative inline-flex size-7 shrink-0 cursor-help touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-muted before:absolute before:-inset-2 before:content-['']"
      >
        <Info className="size-4" aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8} className="z-[100]">
          <Tooltip.Popup className="max-w-72 rounded-lg border bg-popover px-3 py-2 text-xs leading-5 text-popover-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none">
            {content}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
