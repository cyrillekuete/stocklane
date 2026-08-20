import { z } from 'zod';
import { stableId } from './format';

export const CATEGORY_STATUSES = ['Active', 'Inactive', 'Draft', 'Archived'] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const categoryInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(80, 'Name must be 80 characters or fewer'),
  status: z.enum(CATEGORY_STATUSES).optional(),
  featured: z.boolean().optional(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer')
    .optional()
    .nullable(),
  icon: z.string().max(2048, 'Icon value is too long').optional().nullable(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

/** Bundled icon filenames available in /media/store/client/icons/{light|dark}/ */
export const CATEGORY_BUNDLED_ICONS = [
  'running-shoes.svg',
  'flip-flops.svg',
  'slip-on-shoe.svg',
  'sport-sneaker.svg',
  'ski-boots.svg',
  'stiletto-heel.svg',
  'football-boot.svg',
  'block-heel.svg',
  'hiking-boot.svg',
  'ice-skate.svg',
  'ankle-boot.svg',
  'casual-sneaker.svg',
  'sandals.svg',
  'snow-boot.svg',
  'wedge-heel.svg',
  'wellies.svg',
  'heeled-boot.svg',
] as const;

export function normalizeCategoryStatus(value?: string | null): CategoryStatus {
  if (!value) return 'Active';
  const trimmed = value.trim();
  const match = CATEGORY_STATUSES.find((status) => status.toLowerCase() === trimmed.toLowerCase());
  return match ?? 'Active';
}

export function parseCategoryInput(input: {
  name: string;
  status?: string;
  featured?: boolean;
  description?: string | null;
  icon?: string | null;
}): CategoryInput {
  return categoryInputSchema.parse({
    name: input.name,
    status: input.status !== undefined ? normalizeCategoryStatus(input.status) : undefined,
    featured: input.featured,
    description: input.description ?? null,
    icon: input.icon ?? null,
  });
}

/**
 * Collision-safe category code derived from name + unique token.
 * Codes are immutable after create — renaming a category does not regenerate code.
 */
export function generateCategoryCode(name: string, uniqueToken = crypto.randomUUID()) {
  const base =
    stableId('code', name)
      .replace(/^code_/, '')
      .replace(/_/g, '')
      .slice(0, 8)
      .toUpperCase() || 'CAT';
  const suffix = uniqueToken.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `${base}-${suffix}`.slice(0, 16);
}

export function normalizeCategoryName(name: string) {
  return name.trim().toLowerCase();
}

/**
 * Orders / order items store `category` as a free-text snapshot (not an FK).
 * Renaming or deleting an inventory category does not rewrite historical order rows.
 */
export const ORDER_CATEGORY_IS_DENORMALIZED = true as const;
