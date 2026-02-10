import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "bullish" | "bearish" | "neutral" | "warning";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md px-3 py-1 text-sm font-bold uppercase tracking-wider",
        {
          "bg-secondary text-secondary-foreground": variant === "default",
          "bg-green-500/20 text-bullish border border-green-500/30":
            variant === "bullish",
          "bg-red-500/20 text-bearish border border-red-500/30":
            variant === "bearish",
          "bg-gray-500/20 text-neutral border border-gray-500/30":
            variant === "neutral",
          "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30":
            variant === "warning",
        },
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
