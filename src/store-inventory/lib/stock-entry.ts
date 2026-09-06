export const STOCK_ENTRY_TYPES = ['initial', 'purchased', 'adjustment'] as const;

export type StockEntryType = (typeof STOCK_ENTRY_TYPES)[number];

export type StockEntryPrefillLine = {
  productId: string;
  qty: number;
};

export type StockEntryLocationState = {
  type?: StockEntryType;
  warehouseId?: string | null;
  lines?: StockEntryPrefillLine[];
};

export function isStockEntryType(value: string): value is StockEntryType {
  return (STOCK_ENTRY_TYPES as readonly string[]).includes(value);
}

export function parseStockEntryQty(type: StockEntryType, raw: string): number | null {
  const qty = Number(raw);
  if (!Number.isFinite(qty)) return null;
  const truncated = Math.trunc(qty);
  switch (type) {
    case 'adjustment':
      return truncated === 0 ? null : truncated;
    case 'initial':
    case 'purchased':
      return truncated < 1 ? null : truncated;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** Applied entry qty returned by inventory_apply_stock_entry. */
export function parseStockEntryRpcQty(data: unknown): number {
  if (typeof data === 'number' && Number.isFinite(data)) {
    return Math.trunc(data);
  }
  if (typeof data === 'string' && data.trim() !== '') {
    const qty = Number(data);
    if (Number.isFinite(qty)) return Math.trunc(qty);
  }
  throw new Error('Unable to apply stock entry');
}

export function stockEntryLineTotal(qty: number, unitValue: number): number {
  const units = Math.trunc(qty);
  const value = Number(unitValue);
  if (!Number.isFinite(value)) return 0;
  return value * units;
}

export function stockEntryHelpMessage(type: StockEntryType): string {
  switch (type) {
    case 'initial':
      return 'Record opening on-hand for products with no quantity and no stock history in the selected warehouse.';
    case 'purchased':
      return 'Select a warehouse, search and add products with quantities, then add another warehouse if needed. Existing stock is increased, not overwritten.';
    case 'adjustment':
      return 'Increase or decrease on-hand quantity. Use a negative number to reduce stock. Cannot go below reserved quantity.';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function stockEntrySuccessMessage(type: StockEntryType): string {
  switch (type) {
    case 'initial':
      return '{count} initial stock lines applied';
    case 'purchased':
      return '{count} stock lines received into warehouses';
    case 'adjustment':
      return '{count} adjustment lines applied';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function stockEntrySubmitLabel(type: StockEntryType): string {
  switch (type) {
    case 'initial':
      return 'Apply initial stock';
    case 'purchased':
      return 'Receive';
    case 'adjustment':
      return 'Apply adjustment';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function defaultStockEntryQty(type: StockEntryType): string {
  switch (type) {
    case 'adjustment':
      return '';
    case 'initial':
    case 'purchased':
      return '1';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
