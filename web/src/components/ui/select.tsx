import * as React from "react";

import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/15",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
