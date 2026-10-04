import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/account";
import { getStaffSession } from "@/lib/auth/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Header account menu: who is signed in and whether to show the admin entry. Own session only. */
export async function GET() {
  const headers = { "cache-control": "private, no-store" };
  const { user, customer } = await getCurrentCustomer().catch(() => ({ user: null, customer: null }));
  if (!user) return NextResponse.json({ signedIn: false }, { headers });
  const staff = await getStaffSession().catch(() => null);
  return NextResponse.json({ signedIn: true, email: user.email ?? "", name: ((customer?.name as string | null) ?? "").trim() || null, staff: Boolean(staff) }, { headers });
}
