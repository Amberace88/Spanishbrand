import "server-only";
import { getOrder } from "./orders";

/** Tracking lives in GET /v4/orders/{id} → shipment.packages[]. */
export async function getShipments(providerOrderId: string) {
  return (await getOrder(providerOrderId)).shipments;
}
