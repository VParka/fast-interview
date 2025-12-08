import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-md border bg-background px-3 py-2 text-base ring-offset-background transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: "border-input hover:border-input/80 focus-visible:border-primary",
        filled: "bg-secondary/30 border-transparent hover:bg-secondary/40 focus-visible:bg-background focus-visible:border-primary",
        ghost: "border-transparent hover:border-input/50 focus-visible:border-primary",
        error: "border-destructive focus-visible:ring-destructive",
      },
      inputSize: {
        default: "h-10 min-h-touch",
        sm: "h-8 text-xs px-2",
        lg: "h-12 text-base min-h-touch",
        xl: "h-14 text-lg min-h-touch-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
