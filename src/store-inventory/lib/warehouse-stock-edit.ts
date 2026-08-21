/** Resolve qty/reserved for a product within a warehouse stock snapshot. */
export function resolveProductWarehouseStock(
  rows: Array<{ productId: string; qty: number; reserved: number }> | null | undefined,
  productId: string | null | undefined,
): { qty: number; reserved: number } {
  if (!productId || !rows?.length) return { qty: 0, reserved: 0 };
  const row = rows.find((entry) => entry.productId === productId);
  return {
    qty: row?.qty ?? 0,
    reserved: row?.reserved ?? 0,
  };
}
