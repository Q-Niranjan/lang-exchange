import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 transition-colors focus:border-ring focus:ring-2 focus:ring-ring/15",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
