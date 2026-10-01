/** Public base URL where static brand assets (/catalog/art, /brand) can be fetched server-side. */
export function assetBase() {
  return (process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://hispania-brand.netlify.app").replace(/\/$/, "");
}
