import { z } from "zod";

export const fallbackCheckoutSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  specialRequests: z.string().max(500).optional(),
});

export type FallbackCheckoutValues = z.infer<typeof fallbackCheckoutSchema>;

export interface InputFieldDef {
  id: string;
  name: string;
  description?: string;
  dataType: "STRING" | "ENUM" | "BOOL" | "INT" | "FLOAT" | "LOCATION";
  validation?: {
    regex?: string | null;
    minLength?: number | null;
    maxLength?: number | null;
    minValue?: number | null;
    maxValue?: number | null;
    required?: boolean;
    values?: string[] | null;
  };
}

function buildFieldSchema(field: InputFieldDef) {
  let fieldSchema: z.ZodTypeAny;

  switch (field.dataType) {
    case "INT":
      fieldSchema = z.number({ invalid_type_error: `${field.name} must be a number` });
      if (field.validation?.minValue != null)
        fieldSchema = (fieldSchema as z.ZodNumber).min(field.validation.minValue, `Minimum value is ${field.validation.minValue}`);
      if (field.validation?.maxValue != null)
        fieldSchema = (fieldSchema as z.ZodNumber).max(field.validation.maxValue, `Maximum value is ${field.validation.maxValue}`);
      break;
    case "FLOAT":
      fieldSchema = z.number({ invalid_type_error: `${field.name} must be a number` });
      if (field.validation?.minValue != null)
        fieldSchema = (fieldSchema as z.ZodNumber).min(field.validation.minValue, `Minimum value is ${field.validation.minValue}`);
      if (field.validation?.maxValue != null)
        fieldSchema = (fieldSchema as z.ZodNumber).max(field.validation.maxValue, `Maximum value is ${field.validation.maxValue}`);
      break;
    case "BOOL":
      fieldSchema = z.boolean();
      break;
    case "ENUM":
      if (field.validation?.values && field.validation.values.length > 0) {
        fieldSchema = z.enum(field.validation.values as [string, ...string[]], {
          errorMap: () => ({ message: `Please select a valid ${field.name}` }),
        });
      } else {
        fieldSchema = z.string();
      }
      break;
    case "LOCATION":
      fieldSchema = z.string();
      break;
    default:
      fieldSchema = z.string();
  }

  if (field.dataType === "STRING" || field.dataType === "LOCATION") {
    let strSchema = z.string();
    if (field.validation?.regex) {
      strSchema = strSchema.regex(new RegExp(field.validation.regex), `Invalid ${field.name} format`);
    }
    if (field.validation?.minLength != null)
      strSchema = strSchema.min(field.validation.minLength, `${field.name} must be at least ${field.validation.minLength} characters`);
    if (field.validation?.maxLength != null)
      strSchema = strSchema.max(field.validation.maxLength, `${field.name} must be at most ${field.validation.maxLength} characters`);
    fieldSchema = strSchema;
  }

  if (field.validation?.required) {
    if (field.dataType === "STRING" || field.dataType === "LOCATION") {
      fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.name} is required`);
    }
  } else {
    fieldSchema = fieldSchema.optional();
  }

  return fieldSchema;
}

export function buildCheckoutSchema(inputFields: InputFieldDef[]) {
  if (inputFields.length === 0) {
    return fallbackCheckoutSchema;
  }

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of inputFields) {
    shape[field.id] = buildFieldSchema(field);
  }

  return z.object(shape);
}

export const bookingDetailsSchema = z.object({
  date: z.date({ required_error: "Please select a date" }),
  variantId: z.string().min(1, "Please select a ticket type"),
  adults: z.number().min(1, "At least 1 adult required").max(20),
  children: z.number().min(0).max(20).default(0),
});

export type CheckoutFormValues = z.infer<typeof fallbackCheckoutSchema> & Record<string, unknown>;
export type BookingDetailsValues = z.infer<typeof bookingDetailsSchema>;
