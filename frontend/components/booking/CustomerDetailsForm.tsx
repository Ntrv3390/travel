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
import { Loader2 } from "lucide-react";
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
        defaults[field.id] = field.dataType === "BOOL" ? false : "";
      }
      return defaults;
    }, [inputFields]),
  });

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const isFallback = inputFields.length === 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {isFallback ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">First Name</FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 rounded-xl text-base"
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
                    <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 rounded-xl text-base"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 rounded-xl text-base"
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
                    <FormLabel className="text-sm font-medium">Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        className="h-12 rounded-xl text-base"
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

            <FormField
              control={form.control}
              name="specialRequests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Special Requests{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[96px] w-full rounded-xl border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      placeholder="Dietary requirements, accessibility needs, etc."
                      value={field.value as string}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      disabled={field.disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          inputFields.map((f) => (
            <FormField
              key={f.id}
              control={form.control}
              name={f.id}
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
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
                        <SelectTrigger className="h-12 rounded-xl text-base">
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
                      <label className="flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3">
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
                        className="h-12 rounded-xl text-base"
                        type={
                          f.dataType === "INT" || f.dataType === "FLOAT" ? "number" : "text"
                        }
                        {...(f.dataType === "FLOAT" ? { step: "any" } : {})}
                        placeholder={`Enter ${f.name.toLowerCase()}`}
                        value={field.value as string | number}
                        onChange={(e) => {
                          if (f.dataType === "INT") {
                            const v = parseInt(e.target.value, 10);
                            field.onChange(e.target.value === "" ? "" : isNaN(v) ? "" : v);
                          } else if (f.dataType === "FLOAT") {
                            const v = parseFloat(e.target.value);
                            field.onChange(e.target.value === "" ? "" : isNaN(v) ? "" : v);
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

        <Button className="w-full h-14 rounded-xl text-base font-semibold" type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </Form>
  );
}
