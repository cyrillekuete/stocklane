/** Map Supabase / Postgres order RPC errors to user-facing messages. */

const PATTERNS: Array<{ match: RegExp; message: string }> = [
  { match: /order not found/i, message: 'Order not found' },
  { match: /at least one line item/i, message: 'Add at least one product line' },
  { match: /quantity must be at least 1/i, message: 'Quantity must be at least 1' },
  { match: /product is required/i, message: 'Each line item needs a product' },
  { match: /product not found|deleted product|archived/i, message: 'Product is unavailable for ordering' },
  { match: /insufficient available stock|insufficient reserved stock/i, message: 'Not enough stock for this order' },
  { match: /no warehouse available/i, message: 'Select a warehouse or set a default warehouse' },
  { match: /invalid payment status transition/i, message: 'That payment status change is not allowed' },
  { match: /invalid delivery status transition/i, message: 'That delivery status change is not allowed' },
  { match: /already canceled|already cancelled/i, message: 'Order is already canceled' },
  { match: /cannot hard.?delete|forbid.*delete|must cancel/i, message: 'Cancel the order instead of deleting it' },
  { match: /must be reserved before fulfillment/i, message: 'Reserve stock before marking the order shipped' },
  { match: /already fulfilled/i, message: 'Order stock is already fulfilled' },
  { match: /duplicate key|unique.*order_number|idempotency/i, message: 'Order number already exists — retry with a new number' },
  { match: /store_id|tenant/i, message: 'Store scope is required for this order' },
];

export function mapOrderError(error: unknown, fallback = 'Unable to update order') {
  const raw = error instanceof Error ? error.message : String(error ?? fallback);
  for (const entry of PATTERNS) {
    if (entry.match.test(raw)) {
      return new Error(entry.message);
    }
  }
  return error instanceof Error ? error : new Error(raw || fallback);
}
