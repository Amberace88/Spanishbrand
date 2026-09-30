import "server-only";
import type { ZodType } from "zod";
import { env } from "@/lib/env";
import { providerRequest } from "../http";
import { ProviderNotConfiguredError } from "../errors";
import { glErrorBody } from "./types";

export const GELATO_URLS = {
  product: "https://product.gelatoapis.com/v3",
  order: "https://order.gelatoapis.com/v4",
  shipment: "https://shipment.gelatoapis.com/v1",
  ecommerce: "https://ecommerce.gelatoapis.com/v1",
} as const;

function headers(): Record<string, string> {
  const key = env.gelatoApiKey();
  if (!key) throw new ProviderNotConfiguredError("gelato");
  return { "X-API-KEY": key };
}

function errorMessage(body: unknown) {
  const p = glErrorBody.safeParse(body);
  return p.success ? p.data.message ?? p.data.code : undefined;
}

export function gl<T>(
  api: keyof typeof GELATO_URLS,
  path: string,
  schema: ZodType<T>,
  init: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; timeoutMs?: number } = {},
) {
  return providerRequest<T>({
    provider: "gelato",
    baseUrl: GELATO_URLS[api],
    path,
    method: init.method,
    body: init.body,
    headers: headers(),
    schema,
    timeoutMs: init.timeoutMs,
    errorMessage,
  });
}
