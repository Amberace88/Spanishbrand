export function clientIp(req: Request): string {
  return req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "0.0.0.0";
}
