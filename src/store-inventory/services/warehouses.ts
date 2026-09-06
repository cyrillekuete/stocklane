import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { mapWarehouseError } from '../lib/warehouse-errors';
import { aggregateWarehouseStockStats } from '../lib/warehouse-stock-stats';
import type { WarehouseListRow, WarehouseStockRow } from '../types';

export type InventoryWarehouseRow = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  status: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  stock?: { count: number }[] | { qty: number }[];
};

export type WarehouseInput = {
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  status?: string;
  isDefault?: boolean;
};

export type WarehouseDeleteBlockers = {
  lastWarehouse: boolean;
  hasStock: boolean;
  hasPosHistory: boolean;
  onHand: number;
  isDefault: boolean;
  messages: string[];
};

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

function displayDate(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'd MMM, yyyy');
}

function warehouseStatusVariant(label: string) {
  const normalized = label.toLowerCase();
  if (['live', 'active'].includes(normalized)) return 'success';
  if (['inactive', 'archived'].includes(normalized)) return 'destructive';
  return 'secondary';
}

function isActiveStatus(status?: string | null) {
  return (status ?? '').toLowerCase() === 'active';
}

export function mapWarehouse(
  row: InventoryWarehouseRow,
  extras?: { skuCount?: number; onHand?: number },
): WarehouseListRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address,
    city: row.city,
    country: row.country,
    phone: row.phone,
    status: {
      label: row.status,
      variant: warehouseStatusVariant(row.status),
    },
    isDefault: Boolean(row.is_default),
    skuCount: extras?.skuCount ?? 0,
    onHand: extras?.onHand ?? 0,
    created: displayDate(row.created_at),
    updated: displayDate(row.updated_at),
  };
}

async function setDefaultWarehouse(id: string) {
  const client = requireClient();
  const { error } = await client.rpc('inventory_set_default_warehouse', {
    p_warehouse_id: id,
  });
  if (error) throw mapWarehouseError(error, 'Unable to set default warehouse');
}

async function promoteOldestActiveDefault(exceptId?: string) {
  const client = requireClient();
  let query = client
    .from('inventory_warehouses')
    .select('id')
    .ilike('status', 'active')
    .order('created_at')
    .limit(1);
  if (exceptId) {
    query = query.neq('id', exceptId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw mapWarehouseError(error);
  if (!data?.id) {
    throw new Error('At least one Active warehouse is required');
  }
  await setDefaultWarehouse(data.id as string);
  return data.id as string;
}

async function countActiveWarehouses(exceptId?: string) {
  const client = requireClient();
  let query = client
    .from('inventory_warehouses')
    .select('id', { count: 'exact', head: true })
    .ilike('status', 'active');
  if (exceptId) {
    query = query.neq('id', exceptId);
  }
  const { count, error } = await query;
  if (error) throw mapWarehouseError(error);
  return count ?? 0;
}

async function fetchWarehouseRows() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_warehouses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name');
  if (error) throw mapWarehouseError(error, 'Unable to load warehouses');
  return (data ?? []) as InventoryWarehouseRow[];
}

/**
 * Lightweight warehouse list for filters/selects/layout hygiene.
 * Does not scan inventory_warehouse_stock — skuCount/onHand are 0.
 */
export async function fetchWarehouses() {
  const warehouses = await fetchWarehouseRows();
  return warehouses.map((row) => mapWarehouse(row));
}

/**
 * Full warehouse list including skuCount/onHand for the warehouses admin page.
 * Scans inventory_warehouse_stock once; avoid on hot layout paths.
 */
export async function fetchWarehousesWithStats() {
  const client = requireClient();
  const warehouses = await fetchWarehouseRows();
  if (!warehouses.length) return [];

  const { data: stockRows, error: stockError } = await client
    .from('inventory_warehouse_stock')
    .select('warehouse_id, qty');
  if (stockError) throw mapWarehouseError(stockError, 'Unable to load warehouse stock');

  const counts = aggregateWarehouseStockStats(stockRows ?? []);
  return warehouses.map((row) => mapWarehouse(row, counts.get(row.id)));
}

export async function fetchActiveWarehouses() {
  const rows = await fetchWarehouses();
  return rows.filter((row) => isActiveStatus(row.status.label));
}

export async function fetchDefaultWarehouseId() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_warehouses')
    .select('id')
    .eq('is_default', true)
    .ilike('status', 'active')
    .maybeSingle();
  if (error) throw mapWarehouseError(error);
  if (data?.id) return data.id as string;

  const { data: fallback, error: fallbackError } = await client
    .from('inventory_warehouses')
    .select('id')
    .ilike('status', 'active')
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (fallbackError) throw mapWarehouseError(fallbackError);
  return (fallback?.id as string | undefined) ?? null;
}

export async function assertActiveWarehouse(warehouseId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_warehouses')
    .select('id, status')
    .eq('id', warehouseId)
    .maybeSingle();
  if (error) throw mapWarehouseError(error);
  if (!data?.id || !isActiveStatus(data.status as string)) {
    throw new Error('Select an Active warehouse');
  }
  return data.id as string;
}

export async function fetchWarehouseStock(warehouseId: string): Promise<WarehouseStockRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_warehouse_stock')
    .select('id, warehouse_id, product_id, qty, reserved')
    .eq('warehouse_id', warehouseId);
  if (error) throw mapWarehouseError(error, 'Unable to load warehouse stock');
  return ((data ?? []) as Array<{
    id: string;
    warehouse_id: string;
    product_id: string;
    qty: number;
    reserved: number;
  }>).map((row) => ({
    id: row.id,
    warehouseId: row.warehouse_id,
    productId: row.product_id,
    qty: row.qty,
    reserved: row.reserved,
  }));
}

export async function createWarehouse(input: WarehouseInput) {
  const client = requireClient();
  const code = input.code.trim().toUpperCase();
  if (!code || !input.name.trim()) {
    throw new Error('Code and name are required');
  }

  const { data: existing, error: existingError } = await client
    .from('inventory_warehouses')
    .select('id')
    .eq('code', code)
    .maybeSingle();
  if (existingError) throw mapWarehouseError(existingError);
  if (existing?.id) {
    throw new Error('A warehouse with this code already exists');
  }

  const status = input.status ?? 'Active';
  if (input.isDefault && !isActiveStatus(status)) {
    throw new Error('Default warehouse must be Active');
  }

  const id = crypto.randomUUID();
  const { error } = await client.from('inventory_warehouses').insert({
    id,
    code,
    name: input.name.trim(),
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    country: input.country?.trim() || null,
    phone: input.phone?.trim() || null,
    status,
    is_default: false,
  });
  if (error) throw mapWarehouseError(error, 'Unable to create warehouse');

  const { data: existingDefault, error: defaultError } = await client
    .from('inventory_warehouses')
    .select('id')
    .eq('is_default', true)
    .ilike('status', 'active')
    .neq('id', id)
    .maybeSingle();
  if (defaultError) throw mapWarehouseError(defaultError);

  if (input.isDefault || (isActiveStatus(status) && !existingDefault?.id)) {
    await setDefaultWarehouse(id);
  }

  return id;
}

export async function updateWarehouse(id: string, input: Partial<WarehouseInput>) {
  const client = requireClient();
  const { data: current, error: currentError } = await client
    .from('inventory_warehouses')
    .select('id, status, is_default, code')
    .eq('id', id)
    .single();
  if (currentError) throw mapWarehouseError(currentError, 'Warehouse not found');

  const nextStatus = input.status ?? (current.status as string);
  const currentlyDefault = Boolean(current.is_default);
  const nextDefault =
    input.isDefault === undefined ? currentlyDefault : Boolean(input.isDefault);

  if (input.code !== undefined) {
    const code = input.code.trim().toUpperCase();
    if (!code) throw new Error('Code is required');
    if (code !== current.code) {
      const { data: dup, error: dupError } = await client
        .from('inventory_warehouses')
        .select('id')
        .eq('code', code)
        .neq('id', id)
        .maybeSingle();
      if (dupError) throw mapWarehouseError(dupError);
      if (dup?.id) throw new Error('A warehouse with this code already exists');
    }
  }

  if (!isActiveStatus(nextStatus)) {
    const otherActive = await countActiveWarehouses(id);
    if (otherActive < 1) {
      throw new Error('Cannot deactivate the last Active warehouse');
    }
  }

  if (nextDefault && !isActiveStatus(nextStatus)) {
    throw new Error('Default warehouse must be Active');
  }

  if (currentlyDefault && input.isDefault === false) {
    throw new Error('Set another warehouse as default before unchecking this one');
  }

  const payload: Record<string, unknown> = {};
  if (input.code !== undefined) payload.code = input.code.trim().toUpperCase();
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.address !== undefined) payload.address = input.address?.trim() || null;
  if (input.city !== undefined) payload.city = input.city?.trim() || null;
  if (input.country !== undefined) payload.country = input.country?.trim() || null;
  if (input.phone !== undefined) payload.phone = input.phone?.trim() || null;
  if (input.status !== undefined) payload.status = input.status;

  if (Object.keys(payload).length) {
    const { error } = await client.from('inventory_warehouses').update(payload).eq('id', id);
    if (error) throw mapWarehouseError(error, 'Unable to update warehouse');
  }

  if (!isActiveStatus(nextStatus) && currentlyDefault) {
    await promoteOldestActiveDefault(id);
    return;
  }

  if (nextDefault) {
    await setDefaultWarehouse(id);
  }
}

export async function getWarehouseDeleteBlockers(id: string): Promise<WarehouseDeleteBlockers> {
  const client = requireClient();
  const messages: string[] = [];

  const { count: warehouseCount, error: countError } = await client
    .from('inventory_warehouses')
    .select('id', { count: 'exact', head: true });
  if (countError) throw mapWarehouseError(countError);
  const lastWarehouse = (warehouseCount ?? 0) <= 1;
  if (lastWarehouse) messages.push('Cannot delete the last warehouse');

  const { data: warehouse, error: warehouseError } = await client
    .from('inventory_warehouses')
    .select('is_default')
    .eq('id', id)
    .maybeSingle();
  if (warehouseError) throw mapWarehouseError(warehouseError);

  const { data: stockRows, error: stockError } = await client
    .from('inventory_warehouse_stock')
    .select('qty')
    .eq('warehouse_id', id)
    .gt('qty', 0);
  if (stockError) throw mapWarehouseError(stockError);
  const onHand = (stockRows ?? []).reduce((sum, row) => sum + (row.qty ?? 0), 0);
  const hasStock = onHand > 0;
  if (hasStock) {
    messages.push(`Move or clear ${onHand} on-hand units before deleting this warehouse`);
  }

  const { count: saleCount, error: saleError } = await client
    .from('inventory_pos_sales')
    .select('id', { count: 'exact', head: true })
    .eq('warehouse_id', id);
  if (saleError) throw mapWarehouseError(saleError);

  const { count: itemCount, error: itemError } = await client
    .from('inventory_pos_sale_items')
    .select('id', { count: 'exact', head: true })
    .eq('warehouse_id', id);
  if (itemError) throw mapWarehouseError(itemError);

  const hasPosHistory = (saleCount ?? 0) > 0 || (itemCount ?? 0) > 0;
  if (hasPosHistory) {
    messages.push('This warehouse has POS sales history and cannot be deleted');
  }

  return {
    lastWarehouse,
    hasStock,
    hasPosHistory,
    onHand,
    isDefault: Boolean(warehouse?.is_default),
    messages,
  };
}

export async function deleteWarehouse(id: string) {
  const client = requireClient();
  const blockers = await getWarehouseDeleteBlockers(id);
  if (blockers.messages.length) {
    throw new Error(blockers.messages[0]);
  }

  const { error } = await client.from('inventory_warehouses').delete().eq('id', id);
  if (error) throw mapWarehouseError(error, 'Unable to delete warehouse');

  if (blockers.isDefault) {
    const { count: remaining } = await client
      .from('inventory_warehouses')
      .select('id', { count: 'exact', head: true });
    if ((remaining ?? 0) > 0) {
      await promoteOldestActiveDefault();
    }
  }
}

export async function moveWarehouseStock(fromWarehouseId: string, toWarehouseId: string) {
  const client = requireClient();
  const { data, error } = await client.rpc('inventory_move_warehouse_stock', {
    p_from_warehouse_id: fromWarehouseId,
    p_to_warehouse_id: toWarehouseId,
  });
  if (error) throw mapWarehouseError(error, 'Unable to move warehouse stock');
  return Number(data ?? 0);
}

export async function setWarehouseQty(
  warehouseId: string,
  productId: string,
  qty: number,
  expectedQty?: number | null,
) {
  const client = requireClient();
  if (qty > 0) {
    const { data: currentStock, error: currentError } = await client
      .from('inventory_warehouse_stock')
      .select('qty')
      .eq('warehouse_id', warehouseId)
      .eq('product_id', productId)
      .maybeSingle();
    if (currentError) throw mapWarehouseError(currentError, 'Unable to set warehouse quantity');
    const currentQty = Number(currentStock?.qty ?? 0);
    if (qty > currentQty) {
      throw new Error('Stock can only be added with Stock Entry');
    }
  }
  const { data, error } = await client.rpc('inventory_set_warehouse_qty', {
    p_warehouse_id: warehouseId,
    p_product_id: productId,
    p_qty: qty,
    p_expected_qty: expectedQty ?? null,
    p_reason: 'warehouse_set',
  });
  if (error) throw mapWarehouseError(error, 'Unable to set warehouse quantity');
  return Number(data ?? qty);
}

export async function adjustWarehouseQty(warehouseId: string, productId: string, delta: number) {
  const client = requireClient();
  const { data, error } = await client.rpc('inventory_adjust_warehouse_qty', {
    p_warehouse_id: warehouseId,
    p_product_id: productId,
    p_delta: delta,
  });
  if (error) throw mapWarehouseError(error, 'Unable to adjust warehouse quantity');
  return Number(data ?? 0);
}

export async function transferWarehouseQty(
  fromWarehouseId: string,
  toWarehouseId: string,
  productId: string,
  qty: number,
) {
  const client = requireClient();
  const { data, error } = await client.rpc('inventory_transfer_warehouse_qty', {
    p_from_warehouse_id: fromWarehouseId,
    p_to_warehouse_id: toWarehouseId,
    p_product_id: productId,
    p_qty: qty,
  });
  if (error) throw mapWarehouseError(error, 'Unable to transfer warehouse stock');
  return data;
}

export async function ensureDefaultWarehouseStock(productId: string, qty = 0) {
  const warehouseId = await fetchDefaultWarehouseId();
  if (!warehouseId) return;
  await setWarehouseQty(warehouseId, productId, qty);
}
