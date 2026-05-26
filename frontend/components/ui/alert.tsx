import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative w-full rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm", className)} {...props} />
  );
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-destructive", className)} {...props} />;
}
