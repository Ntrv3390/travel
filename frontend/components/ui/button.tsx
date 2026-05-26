import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
type Size = "default" | "sm" | "lg";

const variantStyles: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-brand-600",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeStyles: Record<Size, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-md px-3",
  lg: "h-11 rounded-md px-8",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  href?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, href, ...props }, ref) => {
    const baseClassName = cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      variantStyles[variant],
      sizeStyles[size],
      className,
    );

    if (asChild && href) {
      return (
        <Link href={href} className={baseClassName}>
          {props.children}
        </Link>
      );
    }

    return <button className={baseClassName} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
