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
