import * as React from "react";
import { Controller, FormProvider, useFormContext, type ControllerProps, type FieldPath, type FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";

export const Form = FormProvider;

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(props: ControllerProps<TFieldValues, TName>) {
  return <Controller {...props} />;
}

export function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function FormLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}

export function FormControl({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function FormMessage({ className, children }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { formState } = useFormContext();
  const message = Object.values(formState.errors)[0]?.message;
  return <p className={cn("text-sm text-destructive", className)}>{children ?? String(message ?? "")}</p>;
}
