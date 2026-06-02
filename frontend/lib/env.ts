import { z } from "zod";

const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "https://api-stage.triipzy.com";
const defaultHeadoutPublicApiUrl = process.env.NEXT_PUBLIC_HEADOUT_PUBLIC_API_URL ?? process.env.HEADOUT_PUBLIC_API_URL ?? "https://www.headout.com/api/public";

const envSchema = z.object({
  API_URL: z.string().url().default(defaultApiUrl),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_API_URL: z.string().url().default(defaultApiUrl),
  HEADOUT_PUBLIC_API_URL: z.string().url().default(defaultHeadoutPublicApiUrl),
});

const parsed = envSchema.safeParse({
  API_URL: process.env.API_URL ?? defaultApiUrl,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl,
  HEADOUT_PUBLIC_API_URL: process.env.HEADOUT_PUBLIC_API_URL ?? defaultHeadoutPublicApiUrl,
});

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = parsed.data;
