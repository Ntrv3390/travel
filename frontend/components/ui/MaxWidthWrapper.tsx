import { cn } from "@/lib/utils";

interface MaxWidthWrapperProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function MaxWidthWrapper({
  children,
  className,
  as: Component = "div",
}: MaxWidthWrapperProps) {
  return (
    <Component
      className={cn(
        "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-12",
        className
      )}
    >
      {children}
    </Component>
  );
}
