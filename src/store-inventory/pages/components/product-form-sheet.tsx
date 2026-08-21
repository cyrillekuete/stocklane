'use client';

import { useEffect, useMemo, useState } from 'react';
import { CircleX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import { APP_CURRENCY, parseMoney } from '@/store-inventory/lib/format';
import {
  useActiveCategories,
  useBrands,
  useCategories,
  useCreateProduct,
  useProductVariants,
  useReplaceVariants,
  useUpdateProduct,
} from '@/store-inventory/hooks/use-inventory';
import { useActiveWarehouses } from '@/store-inventory/hooks/use-warehouses';
import type { ProductListRow, ProductVariantRow } from '@/store-inventory/types';
import { Badge, BadgeButton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import { Input, InputWrapper } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ProductFormImageUpload } from './product-form-image-upload';
import { ProductFormVariants } from './product-form-variants';

function statusToFormValue(label?: string) {
  if (label === 'Draft') return 'draft';
  if (label === 'Archived') return 'archived';
  return 'published';
}

function formValueToStatus(value: string) {
  if (value === 'draft') return 'Draft';
  if (value === 'archived') return 'Archived';
  return 'Live';
}

function ProductFormTagInput({
  tags,
  onTagsChange,
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const t = useT();

  const addTag = (tag: string) => {
    const next = tag.trim();
    if (next && !tags.includes(next)) {
      onTagsChange([...tags, next]);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2.5 mb-2.5">
        <Label className="text-xs leading-3">{t('Tags')}</Label>
        <Input
          placeholder={t('Add tags (press Enter or comma)')}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            appearance="light"
            className="flex items-center gap-1"
          >
            {tag}
            <BadgeButton onClick={() => onTagsChange(tags.filter((item) => item !== tag))}>
              <CircleX className="size-3.5 text-muted-foreground" />
            </BadgeButton>
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function ProductFormSheet({
  mode,
  open,
  onOpenChange,
  product,
}: {
  mode: 'new' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductListRow;
}) {
  const isNewMode = mode === 'new';
  const isEditMode = mode === 'edit';
  const t = useT();
  const { data: allCategories } = useCategories();
  const { data: activeCategories } = useActiveCategories();
  const { data: brands } = useBrands();
  const { data: warehouses } = useActiveWarehouses();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const replaceVariants = useReplaceVariants();
  const { data: savedVariants } = useProductVariants(open && isEditMode ? product?.id : undefined);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('published');
  const [featured, setFeatured] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [brandId, setBrandId] = useState<string | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [image, setImage] = useState('11.png');
  const [variants, setVariants] = useState<ProductVariantRow[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [saving, setSaving] = useState(false);
  const defaultWarehouse = warehouses?.find((row) => row.isDefault) ?? warehouses?.[0];

  const categoryOptions = useMemo(() => {
    const active = activeCategories ?? [];
    if (!categoryId) return active;
    if (active.some((row) => row.id === categoryId)) return active;
    const current = (allCategories ?? []).find((row) => row.id === categoryId);
    return current ? [current, ...active] : active;
  }, [activeCategories, allCategories, categoryId]);

  useEffect(() => {
    if (!open) return;
    setName(product?.productInfo.title ?? '');
    setSku(product?.productInfo.label ?? '');
    setBarcode(product?.barcode ?? '');
    setDescription(product?.description ?? product?.productInfo.tooltip ?? '');
    setPrice(product?.price ? String(parseMoney(product.price)) : '');
    setStatus(statusToFormValue(product?.status.label));
    setFeatured(Boolean(product?.featured));
    setCategoryId(product?.categoryId ?? undefined);
    setBrandId(product?.brandId ?? undefined);
    setTags(product?.tags ?? []);
    setImage(product?.image ?? product?.productInfo.image ?? '11.png');
    if (!isEditMode) {
      setVariants([]);
    }
  }, [open, product, isEditMode]);

  useEffect(() => {
    if (!open || isEditMode) return;
    setWarehouseId(defaultWarehouse?.id ?? '');
  }, [open, isEditMode, defaultWarehouse?.id]);

  useEffect(() => {
    if (!open || !isEditMode) return;
    if (savedVariants) setVariants(savedVariants);
  }, [open, isEditMode, savedVariants]);

  const persistStatus = formValueToStatus(status);

  const handleSave = async () => {
    if (!name.trim() || !sku.trim()) {
      toast.error(t('Product name and SKU are required'));
      return;
    }
    const parsedPrice = parseMoney(price);
    if (parsedPrice < 0) {
      toast.error(t('Price cannot be negative'));
      return;
    }
    const seenVariants = new Set<string>();
    for (const variant of variants) {
      const key = `${variant.size}::${variant.color}`.toLowerCase();
      if (seenVariants.has(key)) {
        toast.error(t('Duplicate variant: {size} / {color}', { size: variant.size, color: variant.color }));
        return;
      }
      seenVariants.add(key);
      if (parseMoney(variant.price) < 0) {
        toast.error(t('Variant price cannot be negative'));
        return;
      }
    }
    if (isNewMode && !warehouseId) {
      toast.error(t('Select a warehouse to add this product to'));
      return;
    }
    if (isNewMode && !(warehouses ?? []).length) {
      toast.error(t('Activate a warehouse first'));
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      sku: sku.trim(),
      barcode: barcode.trim(),
      description,
      categoryId: categoryId ?? null,
      brandId: brandId ?? null,
      status: persistStatus,
      featured,
      tags,
      image,
      price: parsedPrice,
    };
    try {
      if (isEditMode) {
        if (!product?.id) {
          toast.error(t('Select a product to edit'));
          return;
        }
        await updateProduct.mutateAsync({ id: product.id, input: payload });
        await replaceVariants.mutateAsync({ productId: product.id, variants });
      } else {
        await createProduct.mutateAsync({
          ...payload,
          warehouseId,
          variants,
        });
      }
      toast.success(isNewMode ? t('Product created') : t('Product saved'));
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('Unable to save product');
      if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')) {
        toast.error(t('SKU or barcode already exists on another active product'));
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 lg:w-[1080px] sm:max-w-none inset-5 border start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b py-3.5 px-5 border-border">
          <SheetTitle className="font-medium">{isNewMode ? t('Create New Product') : t('Edit Product')}</SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0 grow">
          <div className="flex justify-between gap-2 flex-wrap border-b border-border p-5">
            <Select value={status} onValueChange={setStatus} indicatorPosition="right">
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={isNewMode ? t('Select Status') : t('Published')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('Draft')}</SelectItem>
                <SelectItem value="published">{t('Published')}</SelectItem>
                <SelectItem value="archived">{t('Archived')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2.5 text-xs text-gray-800 font-medium">
              {t('Read about')}
              <Link to="#" className="text-primary">
                {t('How to Create Product')}
              </Link>
              <Button variant="outline" className="text-dark" onClick={() => onOpenChange(false)}>
                {t('Cancel')}
              </Button>
              <Button variant="mono" onClick={handleSave} disabled={saving}>
                {isNewMode ? t('Create') : t('Save')}
              </Button>
            </div>
          </div>

          <ScrollArea
            className="flex flex-col h-[calc(100dvh-15.2rem)] mx-1.5"
            viewportClassName="[&>div]:h-full [&>div>div]:h-full"
          >
            <div className="flex flex-wrap lg:flex-nowrap px-3.5 grow">
              <div className="grow lg:border-e border-border lg:pe-5 space-y-5 py-5">
                <Card className="rounded-md">
                  <CardHeader className="min-h-[38px] bg-accent/50">
                    <CardTitle className="text-2sm">{t('Basic Info')}</CardTitle>
                    <CardToolbar>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="product-featured" className="text-xs">
                          {t('Featured')}
                        </Label>
                        <Switch
                          size="sm"
                          id="product-featured"
                          checked={featured}
                          onCheckedChange={setFeatured}
                        />
                      </div>
                    </CardToolbar>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex flex-col gap-2 mb-3">
                      <Label className="text-xs">{t('Product Name')}</Label>
                      <Input placeholder={t('Product Name')} value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-5 mb-2.5">
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs">{t('SKU')}</Label>
                        <Input placeholder={t('SKU')} value={sku} onChange={(e) => setSku(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs">{t('Barcode')}</Label>
                        <Input placeholder={t('Barcode')} value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mb-2.5">
                      <Label className="text-xs">{t('Price')}</Label>
                      <InputWrapper>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground">{APP_CURRENCY}</span>
                      </InputWrapper>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">{t('Product Description')}</Label>
                      <Textarea
                        className="min-h-[100px]"
                        placeholder={t('Product Description')}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-md">
                  <CardHeader className="min-h-[38px] bg-accent/50">
                    <CardTitle className="text-2sm">{t('Category & Brand')}</CardTitle>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">{t('Product Category')}</Label>
                      <Select
                        value={categoryId}
                        onValueChange={setCategoryId}
                        indicatorPosition="right"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select Category')} />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.productInfo.title}
                              {category.status.label.toLowerCase() !== 'active'
                                ? ` (${t(category.status.label)})`
                                : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">{t('Product Brand')}</Label>
                      <Select
                        value={brandId}
                        onValueChange={setBrandId}
                        indicatorPosition="right"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select Brand')} />
                        </SelectTrigger>
                        <SelectContent>
                          {(brands ?? []).map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {isNewMode && (
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs">{t('Warehouse')}</Label>
                        <Select
                          value={warehouseId}
                          onValueChange={setWarehouseId}
                          indicatorPosition="right"
                          disabled={!(warehouses ?? []).length}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                (warehouses ?? []).length
                                  ? t('Select Warehouse')
                                  : t('Activate a warehouse first')
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {(warehouses ?? []).map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name} ({warehouse.code})
                                {warehouse.isDefault ? ` · ${t('Default')}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <ProductFormVariants mode={mode} variants={variants} onVariantsChange={setVariants} />
              </div>

              <div className="w-full lg:w-[420px] shrink-0 lg:mt-5 space-y-5 lg:ps-5">
                <ProductFormImageUpload mode={mode} image={image} onImageChange={setImage} />

                <Separator className="w-full"></Separator>

                <ProductFormTagInput tags={tags} onTagsChange={setTags} />
              </div>
            </div>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="flex-row border-t not-only-of-type:justify-between items-center p-5 border-border gap-2">
          <Select value={status} onValueChange={setStatus} indicatorPosition="right">
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={isNewMode ? t('Select Status') : t('Published')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t('Draft')}</SelectItem>
              <SelectItem value="published">{t('Published')}</SelectItem>
              <SelectItem value="archived">{t('Archived')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button variant="mono" onClick={handleSave} disabled={saving}>
              {isNewMode ? t('Create') : t('Save')}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
