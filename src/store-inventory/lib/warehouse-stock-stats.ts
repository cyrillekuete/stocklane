/** Aggregate per-warehouse SKU/on-hand counts from stock rows (pure; testable). */
export function aggregateWarehouseStockStats(
  stockRows: Array<{ warehouse_id: string; qty: number | null }>,
) {
  const counts = new Map<string, { skuCount: number; onHand: number }>();
  for (const row of stockRows) {
    const current = counts.get(row.warehouse_id) ?? { skuCount: 0, onHand: 0 };
    if ((row.qty ?? 0) > 0) current.skuCount += 1;
    current.onHand += row.qty ?? 0;
    counts.set(row.warehouse_id, current);
  }
  return counts;
}
