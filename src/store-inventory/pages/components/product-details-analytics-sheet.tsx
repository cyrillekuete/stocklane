'use client';

import { useMemo, useState, useEffect } from 'react';
import { SquarePen, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { toAbsoluteUrl } from '@/lib/helpers';
import { formatMoney, parseMoney, parseQty } from '@/store-inventory/lib/format';
import { useProductVariants } from '@/store-inventory/hooks/use-inventory';
import type { ProductListRow } from '@/store-inventory/types';
import { Badge, BadgeDot, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function sparklineFromValues(values: number[], fallback: number) {
  if (!values.length) {
    return [fallback * 0.85, fallback * 0.9, fallback, fallback * 1.05, fallback].map((value) => ({
      value: Number(value.toFixed(2)),
    }));
  }
  return values.map((value) => ({ value }));
}

export function ProductDetailsAnalyticsSheet({
  open,
  onOpenChange,
  product,
  onEdit,
  onManageVariants,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductListRow;
  onEdit?: () => void;
  onManageVariants?: () => void;
  onDelete?: () => void;
}) {
  const { data: variants = [], isLoading: variantsLoading } = useProductVariants(
    open ? product?.id : undefined,
  );
  const image = product?.image ?? product?.productInfo.image ?? '11.png';
  const [selectedImage, setSelectedImage] = useState(image);

  useEffect(() => {
    if (open) {
      setSelectedImage(product?.image ?? product?.productInfo.image ?? '11.png');
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [open, product]);

  const onHandTotal = useMemo(
    () => variants.reduce((sum, variant) => sum + parseQty(variant.onHand), 0),
    [variants],
  );
  const priceSeries = useMemo(
    () => sparklineFromValues(variants.map((variant) => parseMoney(variant.price)), parseMoney(product?.price)),
    [variants, product?.price],
  );
  const stockSeries = useMemo(
    () => sparklineFromValues(variants.map((variant) => parseQty(variant.onHand)), onHandTotal),
    [variants, onHandTotal],
  );
  const uniqueColors = [...new Set(variants.map((variant) => variant.color).filter(Boolean))];
  const uniqueSizes = [...new Set(variants.map((variant) => variant.size).filter(Boolean))];
  const statusVariant = (product?.status.variant ?? 'secondary') as keyof BadgeProps['variant'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 lg:w-[1080px] sm:max-w-none inset-5 border start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b py-3.5 px-5 border-border">
          <SheetTitle tabIndex={0} className="focus:outline-none font-medium">Product Details & Analytics</SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0 grow">
          <div className="flex justify-between gap-2 border-b border-border px-5 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="lg:text-[22px] font-semibold text-foreground leading-none">
                  {product?.productInfo.title ?? 'Select a product'}
                </span>
                {product && (
                  <Badge size="sm" variant={statusVariant} appearance="light">
                    {product.status.label}
                  </Badge>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-1.5 text-2sm">
                <span className="font-normal text-muted-foreground">SKU</span>
                <span className="font-medium text-foreground/80">
                  {product?.productInfo.label ?? '—'}
                </span>
                <BadgeDot className="bg-muted-foreground/60 size-1 mx-1" />
                <span className="font-normal text-muted-foreground">Created</span>
                <span className="font-medium text-foreground/80">{product?.created ?? '—'}</span>
                <BadgeDot className="bg-muted-foreground/60 size-1 mx-1" />
                <span className="font-normal text-muted-foreground">Last Updated</span>
                <span className="font-medium text-foreground/80">{product?.updated ?? '—'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="outline" onClick={onDelete} disabled={!product}>
                Remove
              </Button>
              <Button variant="mono" onClick={onEdit} disabled={!product}>
                Edit Product
              </Button>
            </div>
          </div>
          <ScrollArea
            className="flex flex-col h-[calc(100dvh-15.8rem)] mx-1.5"
            viewportClassName="[&>div]:h-full [&>div>div]:h-full"
          >
            <div className="flex flex-wrap lg:flex-nowrap px-3.5 grow">
              <div className="grow lg:border-e border-border lg:pe-5 space-y-5 py-5">
                <Card className="rounded-md">
                  <CardHeader className="min-h-[34px] bg-accent/50">
                    <CardTitle className="text-2sm">Inventory</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start flex-wrap lg:gap-10 gap-5">
                      {[
                        { label: 'Status', value: product?.status.label ?? '—' },
                        { label: 'In Stock', value: String(onHandTotal) },
                        { label: 'Variants', value: String(variants.length) },
                        { label: 'Price', value: product?.price ?? formatMoney(0) },
                        { label: 'Category', value: product?.category || 'Uncategorized' },
                      ].map((item) => (
                        <div key={item.label} className="flex flex-col gap-1.5">
                          <span className="text-2sm font-normal text-secondary-foreground">
                            {item.label}
                          </span>
                          <span className="text-2sm font-medium text-foreground">
                            {item.label === 'Status' ? (
                              <Badge variant={statusVariant} appearance="light">
                                {item.value}
                              </Badge>
                            ) : (
                              item.value
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-md">
                  <CardHeader className="min-h-[34px] bg-accent/50">
                    <CardTitle className="text-2sm">Trends</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-5 lg:gap-7.5 pt-4 pb-5">
                    <div className="space-y-1">
                      <div className="text-2sm font-normal text-secondary-foreground">
                        Price by variant
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-semibold text-foreground">
                          {product?.price ?? formatMoney(0)}
                        </span>
                        <Badge size="xs" variant="success" appearance="light">
                          <TrendingUp />
                          sample
                        </Badge>
                      </div>
                      <div className="relative">
                        <div className="h-[100px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={priceSeries} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                              <defs>
                                <linearGradient id="salesPriceGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#4921EA" stopOpacity={0.15} />
                                  <stop offset="100%" stopColor="#4921EA" stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <Tooltip
                                cursor={{ stroke: '#4921EA', strokeWidth: 1, strokeDasharray: '2 2' }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-lg p-2 pointer-events-none">
                                        <p className="text-sm font-semibold text-foreground">
                                          {formatMoney(payload[0].value as number)}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#4921EA"
                                fill="url(#salesPriceGradient)"
                                strokeWidth={1}
                                dot={false}
                                activeDot={{ r: 4, fill: '#4921EA', stroke: 'white', strokeWidth: 2 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-2sm font-normal text-secondary-foreground">
                        On-hand by variant
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-semibold text-foreground">{onHandTotal}</span>
                        <Badge size="xs" variant="success" appearance="light">
                          <TrendingUp />
                          units
                        </Badge>
                      </div>
                      <div className="relative">
                        <div className="h-[100px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stockSeries} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                              <defs>
                                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#4921EA" stopOpacity={0.15} />
                                  <stop offset="100%" stopColor="#4921EA" stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <Tooltip
                                cursor={{ stroke: '#4921EA', strokeWidth: 1, strokeDasharray: '2 2' }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-lg p-2 pointer-events-none">
                                        <p className="text-sm font-semibold text-foreground">
                                          {payload[0].value as number}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#4921EA"
                                fill="url(#salesGradient)"
                                strokeWidth={1}
                                dot={false}
                                activeDot={{ r: 4, fill: '#4921EA', stroke: 'white', strokeWidth: 2 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-md">
                  <CardHeader className="min-h-[34px] bg-accent/50">
                    <CardTitle className="text-2sm">Variants</CardTitle>
                    <CardToolbar>
                      <Button mode="link" className="text-primary" onClick={onManageVariants} disabled={!product}>
                        Manage Variants
                      </Button>
                    </CardToolbar>
                  </CardHeader>

                  <CardContent className="p-0">
                    <Table className="overflow-x-auto">
                      <TableHeader>
                        <TableRow className="text-secondary-foreground font-normal text-2sm">
                          <TableHead className="w-[100px] h-8.5 border-e border-border ps-5">Size</TableHead>
                          <TableHead className="w-[100px] h-8.5 border-e border-border">Color</TableHead>
                          <TableHead className="w-[100px] h-8.5 border-e border-border">Price</TableHead>
                          <TableHead className="w-[100px] h-8.5 border-e border-border">Available</TableHead>
                          <TableHead className="w-[100px] h-8.5 border-e border-border">On Hand</TableHead>
                          <TableHead className="w-[50px] h-8.5"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variantsLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                              Loading variants...
                            </TableCell>
                          </TableRow>
                        ) : variants.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                              No variants yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          variants.map((variant, index) => (
                            <TableRow
                              key={variant.id}
                              className={`text-secondary-foreground font-normal text-2sm ${index % 2 === 0 ? 'bg-accent/50' : ''}`}
                            >
                              <TableCell className="py-1 border-e border-border ps-5">
                                EU {variant.size}
                              </TableCell>
                              <TableCell className="py-1 border-e border-border">{variant.color}</TableCell>
                              <TableCell className="py-1 border-e border-border">
                                {formatMoney(variant.price)}
                              </TableCell>
                              <TableCell className="py-1 border-e border-border">{variant.available}</TableCell>
                              <TableCell className="py-1 border-e border-border">{variant.onHand}</TableCell>
                              <TableCell className="text-center py-1">
                                <Button variant="ghost" mode="icon" size="sm" onClick={onEdit}>
                                  <SquarePen />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <div className="w-full shrink-0 lg:w-[420px] py-5 lg:ps-5">
                <div className="mb-5">
                  <Card className="flex items-center justify-center rounded-md bg-accent/50 shadow-none shrink-0 mb-5">
                    <img
                      src={toAbsoluteUrl(`/media/store/client/1200x1200/${selectedImage}`)}
                      className="h-[250px] shrink-0"
                      alt="Main product image"
                    />
                  </Card>
                </div>
                <p className="text-2sm font-normal text-secondary-foreground leading-5 mb-5">
                  {product?.description || product?.productInfo.tooltip || 'No description yet.'}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center lg:gap-13 gap-5">
                    <div className="text-2sm text-secondary-foreground font-normal min-w-[60px]">Category</div>
                    <div className="text-2sm text-secondary-foreground font-medium">
                      {product?.category || 'Uncategorized'}
                    </div>
                  </div>
                  <div className="flex items-center lg:gap-13 gap-5">
                    <div className="text-2sm text-secondary-foreground font-normal min-w-[60px]">Barcode</div>
                    <div className="text-2sm text-secondary-foreground font-medium">
                      {product?.barcode || '—'}
                    </div>
                  </div>
                  <div className="flex items-center lg:gap-13 gap-5">
                    <div className="text-2sm text-secondary-foreground font-normal min-w-[60px]">Colors</div>
                    <div className="text-2sm text-secondary-foreground font-medium">
                      {uniqueColors.length ? uniqueColors.join(', ') : '—'}
                    </div>
                  </div>
                  <div className="flex items-center lg:gap-13 gap-5">
                    <div className="text-2sm text-secondary-foreground font-normal min-w-[60px]">Sizes</div>
                    <div className="text-2sm text-secondary-foreground font-medium">
                      {uniqueSizes.length ? uniqueSizes.join(', ') : '—'}
                    </div>
                  </div>
                  <div className="flex items-center lg:gap-13 gap-5">
                    <div className="text-2sm text-secondary-foreground font-normal min-w-[60px]">Tags</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(product?.tags ?? []).length ? (
                        product?.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary" appearance="light">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-2sm text-secondary-foreground font-medium">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="flex-row border-t pb-4 p-5 border-border gap-2.5 lg:gap-0">
          <Button variant="outline" onClick={onDelete} disabled={!product}>
            Remove
          </Button>
          <Button variant="mono" onClick={onEdit} disabled={!product}>
            Edit Product
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
