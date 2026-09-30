export type ErrorKind = "TRANSIENT" | "PERMANENT";

export interface ProviderErrorInit {
  provider: string;
  endpoint: string;
  status: number | null;
  message: string;
  code?: string | null;
  requestId?: string | null;
  payload?: unknown;
  kind?: ErrorKind;
}

/**
 * Error from a fulfillment provider API. Detailed info is for admins only;
 * customers only ever see a generic message.
 */
export class ProviderError extends Error {
  readonly provider: string;
  readonly endpoint: string;
  readonly status: number | null;
  readonly code: string | null;
  readonly requestId: string | null;
  readonly payload: unknown;
  readonly kind: ErrorKind;

  constructor(init: ProviderErrorInit) {
    super(init.message);
    this.name = "ProviderError";
    this.provider = init.provider;
    this.endpoint = init.endpoint;
    this.status = init.status;
    this.code = init.code ?? null;
    this.requestId = init.requestId ?? null;
    this.payload = init.payload;
    this.kind = init.kind ?? classifyError(init.status, init.message);
  }

  get permanent() {
    return this.kind === "PERMANENT";
  }

  /** The provider may have committed the write even though we saw a failure. */
  get ambiguous() {
    return this.status === null || this.status >= 500 || this.code === "SCHEMA_MISMATCH";
  }

  toAdminJSON() {
    return {
      provider: this.provider,
      endpoint: this.endpoint,
      status: this.status,
      code: this.code,
      requestId: this.requestId,
      message: this.message,
      kind: this.kind,
      payload: this.payload,
      timestamp: new Date().toISOString(),
    };
  }
}

export class UnsupportedCapabilityError extends Error {
  constructor(provider: string, capability: string) {
    super(`${provider} does not support ${capability} via API`);
    this.name = "UnsupportedCapabilityError";
  }
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`${provider} API credentials are not configured`);
    this.name = "ProviderNotConfiguredError";
  }
}

const PERMANENT_PATTERNS = [
  /invalid address|address.*(invalid|not valid)|recipient/i,
  /invalid variant|variant.*(not found|invalid|discontinued)/i,
  /missing (print )?file|file.*(missing|invalid|could not be)/i,
  /discontinued/i,
  /unsupported (destination|country)|does not ship|not (available|supported) in/i,
  /out of stock/i,
];

/**
 * Temporary errors (network, timeouts, 5xx, 429) are retried with backoff.
 * Permanent errors (bad address, bad variant, missing file, discontinued,
 * unsupported destination, other 4xx) go to REQUIRES_REVIEW immediately.
 */
export function classifyError(status: number | null, message: string): ErrorKind {
  if (PERMANENT_PATTERNS.some((re) => re.test(message))) return "PERMANENT";
  if (status === null) return "TRANSIENT"; // network / timeout
  if (status === 408 || status === 425 || status === 429) return "TRANSIENT";
  if (status >= 500) return "TRANSIENT";
  if (status >= 400) return "PERMANENT";
  return "TRANSIENT";
}

export function isProviderError(e: unknown): e is ProviderError {
  return e instanceof ProviderError;
}
