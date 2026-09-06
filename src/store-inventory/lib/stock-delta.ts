/** Compute display delta from on-hand qty versus target/threshold. */
export function stockDeltaFromQty(
  qty: number,
  threshold: number,
): { label: string; variant: string } {
  const delta = qty - threshold;
  if (delta > 0) {
    return { label: `+${delta}`, variant: 'success' };
  }
  if (delta < 0) {
    return { label: String(delta), variant: 'destructive' };
  }
  return { label: '0', variant: 'secondary' };
}

type StockLevelOverlaySource = {
  threshold?: number | null;
};

/** Overlay warehouse qty/reserved onto a stock level, always applying computed delta. */
export function overlayWarehouseStockLevel<T extends StockLevelOverlaySource>(
  stockLevel: T | null | undefined,
  qty: number,
  reserved: number,
): T & { qty: number; reserved: number; delta_label: string; delta_variant: string } {
  const threshold = Number(stockLevel?.threshold ?? 0);
  const delta = stockDeltaFromQty(qty, Number.isFinite(threshold) ? threshold : 0);
  return {
    ...(stockLevel ?? ({} as T)),
    qty,
    reserved,
    delta_label: delta.label,
    delta_variant: delta.variant,
  };
}
