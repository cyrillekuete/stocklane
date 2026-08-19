import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
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

async function clearDefaultFlag(exceptId?: string) {
  const client = requireClient();
  let query = client.from('inventory_warehouses').update({ is_default: false }).eq('is_default', true);
  if (exceptId) {
    query = query.neq('id', exceptId);
  }
  const { error } = await query;
  if (error) throw error;
}

export async function fetchWarehouses() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_warehouses')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name');
  if (error) throw error;

  const warehouses = (data ?? []) as InventoryWarehouseRow[];
  if (!warehouses.length) return [];

  const { data: stockRows } = await client
    .from('inventory_warehouse_stock')
    .select('warehouse_id, qty');

  const counts = new Map<string, { skuCount: number; onHand: number }>();
  for (const row of stockRows ?? []) {
    const current = counts.get(row.warehouse_id) ?? { skuCount: 0, onHand: 0 };
    if (row.qty > 0) current.skuCount += 1;
    current.onHand += row.qty ?? 0;
    counts.set(row.warehouse_id, current);
  }

  return warehouses.map((row) => mapWarehouse(row, counts.get(row.id)));
}

export async function fetchActiveWarehouses() {
  const rows = await fetchWarehouses();
  return rows.filter((row) => row.status.label.toLowerCase() === 'active');
}

export async function fetchDefaultWarehouseId() {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_warehouses')
    .select('id')
    .eq('is_default', true)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return data.id as string;

  const { data: fallback, error: fallbackError } = await client
    .from('inventory_warehouses')
    .select('id')
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (fallbackError) throw fallbackError;
  return (fallback?.id as string | undefined) ?? null;
}

export async function fetchWarehouseStock(warehouseId: string): Promise<WarehouseStockRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('inventory_warehouse_stock')
    .select('id, warehouse_id, product_id, qty, reserved')
    .eq('warehouse_id', warehouseId);
  if (error) throw error;
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
  const id = crypto.randomUUID();
  if (input.isDefault) {
    await clearDefaultFlag();
  }
  const { error } = await client.from('inventory_warehouses').insert({
    id,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    country: input.country?.trim() || null,
    phone: input.phone?.trim() || null,
    status: input.status ?? 'Active',
    is_default: Boolean(input.isDefault),
  });
  if (error) throw error;
  return id;
}

export async function updateWarehouse(id: string, input: Partial<WarehouseInput>) {
  const client = requireClient();
  if (input.isDefault) {
    await clearDefaultFlag(id);
  }
  const payload: Record<string, unknown> = {};
  if (input.code !== undefined) payload.code = input.code.trim().toUpperCase();
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.address !== undefined) payload.address = input.address?.trim() || null;
  if (input.city !== undefined) payload.city = input.city?.trim() || null;
  if (input.country !== undefined) payload.country = input.country?.trim() || null;
  if (input.phone !== undefined) payload.phone = input.phone?.trim() || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.isDefault !== undefined) payload.is_default = Boolean(input.isDefault);
  if (!Object.keys(payload).length) return;
  const { error } = await client.from('inventory_warehouses').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteWarehouse(id: string) {
  const client = requireClient();
  const { count: warehouseCount, error: countError } = await client
    .from('inventory_warehouses')
    .select('id', { count: 'exact', head: true });
  if (countError) throw countError;
  if ((warehouseCount ?? 0) <= 1) {
    throw new Error('Cannot delete the last warehouse');
  }

  const { data: stockRows, error: stockError } = await client
    .from('inventory_warehouse_stock')
    .select('qty')
    .eq('warehouse_id', id)
    .gt('qty', 0)
    .limit(1);
  if (stockError) throw stockError;
  if (stockRows?.length) {
    throw new Error('Move or clear stock before deleting this warehouse');
  }

  const { data: warehouse, error: warehouseError } = await client
    .from('inventory_warehouses')
    .select('is_default')
    .eq('id', id)
    .single();
  if (warehouseError) throw warehouseError;

  const { error } = await client.from('inventory_warehouses').delete().eq('id', id);
  if (error) throw error;

  if (warehouse?.is_default) {
    const { data: next } = await client
      .from('inventory_warehouses')
      .select('id')
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (next?.id) {
      await client.from('inventory_warehouses').update({ is_default: true }).eq('id', next.id);
    }
  }
}

export async function setWarehouseQty(warehouseId: string, productId: string, qty: number) {
  const client = requireClient();
  const { data, error } = await client.rpc('inventory_set_warehouse_qty', {
    p_warehouse_id: warehouseId,
    p_product_id: productId,
    p_qty: qty,
  });
  if (error) throw error;
  return Number(data ?? qty);
}

export async function adjustWarehouseQty(warehouseId: string, productId: string, delta: number) {
  const client = requireClient();
  const { data, error } = await client.rpc('inventory_adjust_warehouse_qty', {
    p_warehouse_id: warehouseId,
    p_product_id: productId,
    p_delta: delta,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function ensureDefaultWarehouseStock(productId: string, qty = 0) {
  const warehouseId = await fetchDefaultWarehouseId();
  if (!warehouseId) return;
  await setWarehouseQty(warehouseId, productId, qty);
}
