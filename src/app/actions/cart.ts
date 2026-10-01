"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { addToCart, refreshCartPrices, setLineQuantity } from "@/lib/cart/cart";
import { createCheckout } from "@/lib/payments/checkout";
import { track } from "@/lib/analytics/track";
import { isConfigured } from "@/lib/env";

export async function addToCartAction(variantId: string, quantity = 1, personalization?: unknown) {
  if (!isConfigured.db()) return { ok: false as const, error: "UNAVAILABLE" };
  if (!z.string().uuid().safeParse(variantId).success) return { ok: false as const, error: "UNAVAILABLE" };
  if (personalization !== undefined && JSON.stringify(personalization).length > 20_000) return { ok: false as const, error: "UNAVAILABLE" };
  const res = await addToCart(variantId, quantity, personalization);
  if (res.ok) {
    const c = await cookies();
    if (c.get("consent")?.value === "all") await track({ event: "add_to_cart", productId: res.productId, sessionId: c.get("sid")?.value ?? null, metadata: { variantId, quantity } });
    revalidatePath("/", "layout");
  }
  return res;
}

export async function updateLineAction(formData: FormData) {
  const lineId = String(formData.get("lineId") ?? "");
  const qty = Number(formData.get("quantity") ?? 0);
  if (!z.string().uuid().safeParse(lineId).success || !Number.isFinite(qty)) return;
  await setLineQuantity(lineId, qty);
  if (qty <= 0) {
    const c = await cookies();
    if (c.get("consent")?.value === "all") await track({ event: "remove_from_cart", sessionId: c.get("sid")?.value ?? null, metadata: { lineId } });
  }
  revalidatePath("/", "layout");
}

export async function refreshCartAction() {
  await refreshCartPrices();
  revalidatePath("/", "layout");
}

const checkoutSchema = z.object({
  email: z.string().email().max(200),
  country: z.string().length(2),
  marketing: z.string().optional(),
  discount: z.string().max(40).optional(),
  cause: z.enum(["VETERANOS", "MAYORES", "INFANCIA", "ANIMALES"]).optional(),
});

export async function checkoutAction(_prev: { error?: string } | null, formData: FormData): Promise<{ error?: string }> {
  const parsed = checkoutSchema.safeParse({
    email: formData.get("email"),
    country: formData.get("country"),
    marketing: formData.get("marketing") ?? undefined,
    discount: (formData.get("discount") as string) || undefined,
    cause: (formData.get("cause") as string) || undefined,
  });
  if (!parsed.success) return { error: "generic" };
  const res = await createCheckout({ email: parsed.data.email, country: parsed.data.country, marketingConsent: parsed.data.marketing === "on", discountCode: parsed.data.discount, cause: parsed.data.cause });
  if (!res.ok) return { error: res.error };
  redirect(res.url);
}
