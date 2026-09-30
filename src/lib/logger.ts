export type LogCategory =
  | "AUTH"
  | "PAYMENT"
  | "ORDER"
  | "FULFILLMENT"
  | "PROVIDER"
  | "WEBHOOK"
  | "EMAIL"
  | "AI"
  | "ADMIN"
  | "SECURITY"
  | "CRON"
  | "CATALOG";

type Level = "debug" | "info" | "warn" | "error";

const SECRET_KEYS = /(key|secret|token|password|authorization|signature)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEYS.test(k) ? "[REDACTED]" : redact(v, depth + 1);
  }
  return out;
}

function emit(level: Level, category: LogCategory, message: string, data?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    category,
    message,
    ...(data ? { data: redact(data) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Structured JSON logger with secret redaction. */
export const log = {
  debug: (c: LogCategory, m: string, d?: Record<string, unknown>) => emit("debug", c, m, d),
  info: (c: LogCategory, m: string, d?: Record<string, unknown>) => emit("info", c, m, d),
  warn: (c: LogCategory, m: string, d?: Record<string, unknown>) => emit("warn", c, m, d),
  error: (c: LogCategory, m: string, d?: Record<string, unknown>) => emit("error", c, m, d),
};
