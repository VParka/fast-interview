import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] no-select [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-mint hover:shadow-glow",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",
        outline: "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // IMSAM Custom Variants
        hero: "bg-primary text-primary-foreground font-semibold text-base rounded-xl shadow-mint hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all duration-300",
        "hero-outline": "border-2 border-primary/50 bg-transparent text-foreground hover:bg-primary/10 hover:border-primary font-semibold text-base rounded-xl backdrop-blur-sm transition-all duration-300",
        glass: "bg-card/50 backdrop-blur-md text-foreground hover:bg-card/80 border border-border/50 shadow-sm hover:shadow-md",
        mint: "bg-primary text-primary-foreground font-semibold shadow-mint hover:shadow-glow hover:scale-[1.02]",
        "mint-outline": "border-2 border-primary/50 text-primary hover:bg-primary/10 hover:border-primary",
        soft: "bg-secondary/50 text-foreground hover:bg-secondary/80 border border-border/30",
        gradient: "bg-gradient-to-r from-mint to-soft-blue text-navy font-semibold shadow-mint hover:shadow-glow hover:scale-[1.02]",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-touch",
        sm: "h-9 px-3 text-xs rounded-md",
        lg: "h-12 px-6 text-base rounded-lg min-h-touch",
        xl: "h-14 px-10 text-base rounded-xl min-h-touch-lg",
        icon: "h-10 w-10 min-h-touch min-w-touch",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12 min-h-touch min-w-touch",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
