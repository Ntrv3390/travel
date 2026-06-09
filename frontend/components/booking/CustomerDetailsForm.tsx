"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { buildCheckoutSchema, type InputFieldDef } from "@/lib/validations";

interface CustomerDetailsFormProps {
  submitLabel: string;
  submitting: boolean;
  inputFields: InputFieldDef[];
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}

export function CustomerDetailsForm({ submitLabel, submitting, inputFields, onSubmit }: CustomerDetailsFormProps) {
  const schema = useMemo(() => buildCheckoutSchema(inputFields), [inputFields]);

  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues: useMemo(() => {
      if (inputFields.length === 0) {
        return { firstName: "", lastName: "", email: "", phone: "", specialRequests: "" };
      }
      const defaults: Record<string, unknown> = {};
      for (const field of inputFields) {
        if (field.dataType === "BOOL") {
          defaults[field.id] = false;
        } else {
          defaults[field.id] = "";
        }
      }
      return defaults;
    }, [inputFields]),
  });

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const isFallback = inputFields.length === 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isFallback ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John"
                        value={field.value as string}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={field.disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Doe"
                        value={field.value as string}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={field.disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={field.value as string}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={field.disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 555 0123"
                        value={field.value as string}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={field.disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        ) : (
          inputFields.map((f) => (
            <FormField
              key={f.id}
              control={form.control}
              name={f.id}
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    {f.name}
                    {f.validation?.required && <span className="ml-1 text-destructive">*</span>}
                  </FormLabel>
                  {f.description && (
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  )}
                  <FormControl>
                    {f.dataType === "ENUM" ? (
                      <Select
                        value={typeof field.value === "string" ? field.value : ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${f.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(f.validation?.values ?? []).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : f.dataType === "BOOL" ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4 rounded border-border accent-brand-600"
                        />
                        <span className="text-sm text-muted-foreground">{f.name}</span>
                      </label>
                    ) : (
                      <Input
                        type={
                          f.dataType === "INT" ? "number" :
                          f.dataType === "FLOAT" ? "number" :
                          "text"
                        }
                        {...(f.dataType === "FLOAT" ? { step: "any" } : {})}
                        placeholder={`Enter ${f.name.toLowerCase()}`}
                        value={field.value as string | number}
                        onChange={(e) => {
                          if (f.dataType === "INT") {
                            const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                            field.onChange(val === "" ? "" : (isNaN(val) ? "" : val));
                          } else if (f.dataType === "FLOAT") {
                            const val = e.target.value === "" ? "" : parseFloat(e.target.value);
                            field.onChange(val === "" ? "" : (isNaN(val) ? "" : val));
                          } else {
                            field.onChange(e.target.value);
                          }
                        }}
                      />
                    )}
                  </FormControl>
                  {fieldState.error && (
                    <p className="text-sm text-destructive">{fieldState.error.message}</p>
                  )}
                </FormItem>
              )}
            />
          ))
        )}
        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? "Processing..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
