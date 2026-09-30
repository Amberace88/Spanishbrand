import "server-only";
import type { ZodType } from "zod";
import { env } from "@/lib/env";
import { providerRequest } from "../http";
import { ProviderNotConfiguredError } from "../errors";
import { pfErrorBody } from "./types";

export const PRINTFUL_BASE_URL = "https://api.printful.com";

function headers(): Record<string, string> {
  const key = env.printfulApiKey();
  if (!key) throw new ProviderNotConfiguredError("printful");
  const h: Record<string, string> = { Authorization: `Bearer ${key}` };
  const storeId = env.printfulStoreId();
  if (storeId) h["X-PF-Store-Id"] = storeId; // required for account-level tokens
  return h;
}

function errorMessage(body: unknown): string | undefined {
  const parsed = pfErrorBody.safeParse(body);
  if (!parsed.success) return undefined;
  const e = parsed.data.error;
  const r = typeof parsed.data.result === "string" ? parsed.data.result : undefined;
  return e?.message ?? e?.reason ?? r;
}

export function pf<T>(
  path: string,
  schema: ZodType<T>,
  init: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  return providerRequest<T>({
    provider: "printful",
    baseUrl: PRINTFUL_BASE_URL,
    path,
    method: init.method,
    body: init.body,
    headers: headers(),
    schema,
    timeoutMs: init.timeoutMs,
    errorMessage,
  });
}
