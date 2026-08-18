'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { Star, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { toAbsoluteUrl } from '@/lib/helpers';
import { formatMoney, parseMoney } from '@/store-inventory/lib/format';
import {
  useCategoryProducts,
  useDeleteCategory,
  useUpdateCategory,
} from '@/store-inventory/hooks/use-inventory';
import type { CategoryListRow } from '@/store-inventory/types';
import { Badge, BadgeDot, BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Textarea } from '@/components/ui/textarea';

function iconFileName(icon?: string | null) {
  if (!icon) return null;
  if (icon.startsWith('data:') || icon.startsWith('blob:')) return null;
  return icon.includes('/') ? (icon.split('/').pop() as string) : icon;
}

export function CategoryDetailsEditSheet({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryListRow;
}) {
  const featuredId = useId();
  const imageInputId = useId();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { data: products = [] } = useCategoryProducts(open ? category?.id : undefined);

  const [categoryName, setCategoryName] = useState('');
  const [status, setStatus] = useState('active');
  const [description, setDescription] = useState('');
  const [featured, setFeatured] = useState(false);
  const [icon, setIcon] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategoryName(category?.productInfo.title ?? '');
    setStatus(category?.status.label.toLowerCase() ?? 'active');
    setDescription(category?.description ?? '');
    setFeatured(Boolean(category?.featured));
    setIcon(iconFileName(category?.productInfo.image) ?? 'running-shoes.svg');
    setPreviewUrl(null);
  }, [open, category]);

  const bundledIcon = iconFileName(icon);
  const isPending = updateCategory.isPending || deleteCategory.isPending;

  const metrics = useMemo(() => {
    const prices = products.map((product) => parseMoney(product.price));
    const stockValues = products.map((product) => parseMoney(product.stock_level?.total_value));
    const totalQty = products.reduce(
      (sum, product) => sum + (product.stock_level?.qty ?? 0),
      0,
    );
    const avgPrice = prices.length
      ? prices.reduce((sum, value) => sum + value, 0) / prices.length
      : 0;
    const totalSalesValue = stockValues.reduce((sum, value) => sum + value, 0);

    return {
      totalQty: totalQty || products.length,
      earning: category?.totalEarnings ?? formatMoney(0),
      avgPrice,
      productCount: products.length,
      totalSalesValue,
      priceSeries: (prices.length ? prices : [0]).map((value) => ({ value })),
      salesSeries: (stockValues.length ? stockValues : [0]).map((value) => ({ value })),
    };
  }, [products, category?.totalEarnings]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClose = () => onOpenChange(false);

  const handleSave = async () => {
    if (!category?.id) {
      onOpenChange(false);
      return;
    }
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }
    const nextStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Active';
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        input: {
          name: categoryName.trim(),
          status: nextStatus,
          featured,
          description,
          icon: bundledIcon ?? 'running-shoes.svg',
        },
      });
      toast.success('Category saved');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save category');
    }
  };

  const handleDelete = async () => {
    if (!category?.id) {
      onOpenChange(false);
      return;
    }
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success('Category deleted');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete category');
    }
  };

  const statusVariant = (category?.status.variant ?? 'secondary') as BadgeProps['variant'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 lg:w-[1080px] sm:max-w-none inset-5 border start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b py-3.5 px-5 border-border">
          <SheetTitle className="font-medium">Category Details</SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0 grow">
          <div className="flex justify-between flex-wrap gap-2 border-b border-border px-5 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="lg:text-[22px] font-semibold text-foreground leading-none">
                  {category?.productInfo.title ?? 'Category'}
                </span>
                {category?.status.label ? (
                  <Badge size="sm" variant={statusVariant} appearance="light">
                    {category.status.label}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center flex-wrap gap-2 text-2sm">
                <span className="font-normal text-muted-foreground">
                  {category?.productInfo.title ?? '—'}
                </span>
                <span className="font-medium text-foreground">
                  {category?.productInfo.label || '—'}
                </span>
                <BadgeDot className="bg-muted-foreground size-1" />
                <span className="font-normal text-muted-foreground">
                  Created
                </span>
                <span className="font-medium text-foreground">
                  {category?.created || '—'}
                </span>
                <BadgeDot className="bg-muted-foreground size-1" />
                <span className="font-normal text-muted-foreground">
                  Last Updated
                </span>
                <span className="font-medium text-foreground">
                  {category?.updated || '—'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" onClick={handleClose} disabled={isPending}>
                Close
              </Button>
              <Button variant="outline" onClick={handleDelete} disabled={isPending || !category?.id}>
                Delete
              </Button>
              <Button variant="mono" onClick={handleSave} disabled={isPending || !category?.id}>
                Save
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
                    <CardTitle className="text-2sm">Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start lg:gap-10 gap-5">
                      {[
                        { label: 'Total Qty', value: String(metrics.totalQty) },
                        { label: 'Earning', value: metrics.earning },
                        { label: 'Return Rate', value: '—' },
                        { label: 'Avg. Margin', value: '—' },
                        { label: 'Avg. Rating', value: '—' },
                      ].map((item) => (
                        <div key={item.label} className="flex flex-col gap-1.5">
                          <span className="text-2sm font-normal text-secondary-foreground">
                            {item.label}
                          </span>
                          <span className="text-2sm font-medium text-foreground">
                            {item.label?.includes('Avg. Rating') ? (
                              <Badge
                                size="sm"
                                variant="warning"
                                appearance="outline"
                              >
                                <Star
                                  className="text-[#FEC524]"
                                  fill="#FEC524"
                                />
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
                    <CardTitle className="text-2sm">Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="grid lg:grid-cols-2 gap-5 lg:gap-7.5 pt-4 pb-5">
                    <div className="space-y-1">
                      <div className="text-2sm font-normal text-secondary-foreground">
                        Avg. Product Price
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-semibold text-foreground">
                          {formatMoney(metrics.avgPrice)}
                        </span>
                        {metrics.productCount > 0 ? (
                          <Badge size="xs" variant="success" appearance="light">
                            <TrendingUp />
                            {metrics.productCount}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="relative">
                        <div className="h-[90px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={metrics.priceSeries}
                              margin={{
                                top: 5,
                                right: 5,
                                left: 5,
                                bottom: 5,
                              }}
                            >
                              <defs>
                                <linearGradient
                                  id="salesPriceGradient"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor="#4921EA"
                                    stopOpacity={0.1}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor="#4921EA"
                                    stopOpacity={0.02}
                                  />
                                </linearGradient>
                              </defs>
                              <Tooltip
                                cursor={{
                                  stroke: '#4921EA',
                                  strokeWidth: 1,
                                  strokeDasharray: '2 2',
                                }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const value = payload[0].value as number;
                                    return (
                                      <div className="bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-lg p-2 pointer-events-none">
                                        <p className="text-sm font-semibold text-foreground">
                                          {formatMoney(value)}
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
                                activeDot={{
                                  r: 4,
                                  fill: '#4921EA',
                                  stroke: 'white',
                                  strokeWidth: 2,
                                }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-2sm font-normal text-secondary-foreground">
                        Category Product Sales
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-semibold text-foreground">
                          {metrics.productCount.toLocaleString()}
                        </span>
                        <span className="text-2sm font-normal text-secondary-foreground ps-2.5">
                          {formatMoney(metrics.totalSalesValue)}
                        </span>
                      </div>

                      <div className="relative">
                        <div className="h-[90px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                              data={metrics.salesSeries}
                              margin={{
                                top: 5,
                                right: 5,
                                left: 5,
                                bottom: 5,
                              }}
                            >
                              <defs>
                                <linearGradient
                                  id="salesGradient"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor="#4921EA"
                                    stopOpacity={0.1}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor="#4921EA"
                                    stopOpacity={0.02}
                                  />
                                </linearGradient>
                              </defs>
                              <Tooltip
                                cursor={{
                                  stroke: '#4921EA',
                                  strokeWidth: 1,
                                  strokeDasharray: '2 2',
                                }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const value = payload[0].value as number;
                                    return (
                                      <div className="bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-lg p-2 pointer-events-none">
                                        <p className="text-sm font-semibold text-foreground">
                                          {formatMoney(value)}
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
                                activeDot={{
                                  r: 4,
                                  fill: '#4921EA',
                                  stroke: 'white',
                                  strokeWidth: 2,
                                }}
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
                    <CardTitle className="text-2sm">Category Items</CardTitle>
                    <CardToolbar>
                      <span className="text-xs text-muted-foreground">
                        {products.length} {products.length === 1 ? 'product' : 'products'}
                      </span>
                    </CardToolbar>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[600px]">
                        <TableHeader>
                          <TableRow className="text-secondary-foreground font-normal text-2sm bg-accent/50">
                            <TableHead className="w-[200px] h-8.5 border-e border-border ps-3.5">
                              Product Info
                            </TableHead>
                            <TableHead className="w-[120px] h-8.5 border-e border-border">
                              Total Sales
                            </TableHead>
                            <TableHead className="w-[120px] h-8.5">
                              Last Moved
                            </TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          {products.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                                No products in this category
                              </TableCell>
                            </TableRow>
                          ) : (
                            products.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="border-e border-border ps-3.5 py-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <Card className="flex items-center justify-center rounded-md bg-accent/50 h-[40px] w-[50px] shadow-none shrink-0">
                                      <img
                                        src={toAbsoluteUrl(
                                          `/media/store/client/1200x1200/${item.image ?? '11.png'}`,
                                        )}
                                        className="cursor-pointer h-[40px] object-cover rounded"
                                        alt={item.name}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = toAbsoluteUrl('/media/store/client/placeholder.png');
                                        }}
                                      />
                                    </Card>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-2sm font-medium text-foreground leading-3.5">
                                        {item.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground uppercase font-normal">
                                        sku:{' '}
                                        <span className="text-xs font-medium text-secondary-foreground">
                                          {item.sku}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-1 border-e border-border">
                                  {formatMoney(item.stock_level?.total_value)}
                                </TableCell>
                                <TableCell className="py-1">
                                  {item.stock_level?.last_moved || '—'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="w-full shrink-0 lg:w-[420px] py-5 lg:ps-5 space-y-4">
                <div>
                  <div className="relative">
                    <Card className="flex items-center justify-center rounded-md bg-accent/50 h-[200px] shadow-none shrink-0">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          className="cursor-pointer h-[200px] object-contain"
                          alt="Category"
                        />
                      ) : bundledIcon ? (
                        <>
                          <img
                            src={toAbsoluteUrl(`/media/store/client/icons/light/${bundledIcon}`)}
                            className="cursor-pointer h-[200px] object-contain dark:hidden"
                            alt="Category"
                          />
                          <img
                            src={toAbsoluteUrl(`/media/store/client/icons/dark/${bundledIcon}`)}
                            className="cursor-pointer h-[200px] object-contain light:hidden"
                            alt="Category"
                          />
                        </>
                      ) : null}
                    </Card>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id={imageInputId}
                    />
                    <label htmlFor={imageInputId} className="absolute bottom-3 right-3">
                      <Button size="sm" variant="outline" asChild>
                        <span>Change</span>
                      </Button>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Label className="text-xs">Category Name</Label>
                  <Input
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Category Name"
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={setStatus} indicatorPosition="right">
                    <SelectTrigger>
                      <SelectValue placeholder="Active" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2.5">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    className="h-[100px]"
                    placeholder="Category Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={featuredId}
                    checked={featured}
                    onCheckedChange={(value) => setFeatured(value === true)}
                    size="sm"
                  />
                  <Label htmlFor={featuredId}>Featured</Label>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="flex-row border-t pb-4 p-5 border-border gap-2.5 lg:gap-0">
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Close
          </Button>
          <Button variant="outline" onClick={handleDelete} disabled={isPending || !category?.id}>
            Delete
          </Button>
          <Button variant="mono" onClick={handleSave} disabled={isPending || !category?.id}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
