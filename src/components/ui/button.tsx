import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-2 border-ink bg-accent text-white hover:bg-[var(--accent-lite)] active:translate-y-px",
        destructive:
          "border-2 border-ink bg-[var(--destructive)] text-white hover:brightness-95 active:translate-y-px",
        outline:
          "border-2 border-ink bg-surface text-ink hover:bg-accent hover:text-ink active:translate-y-px",
        secondary:
          "border-2 border-ink bg-surface-2 text-ink hover:bg-accent active:translate-y-px",
        ghost: "font-semibold text-[var(--text-muted)] hover:bg-surface-2 hover:text-ink",
        link: "font-semibold text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 py-2",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-11 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
