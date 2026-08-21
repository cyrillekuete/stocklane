'use client';

import { useState } from 'react';
import {
  CheckCircle,
  ClipboardPenLine,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/i18n/use-t';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, InputWrapper } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatMoney, APP_CURRENCY } from '@/store-inventory/lib/format';

interface Variant {
  id: string;
  size: string;
  color: string;
  onHand: string;
  price: string;
  available: string;
}

export function ProductFormVariants({
  variants: controlledVariants,
  onVariantsChange,
}: {
  mode?: 'new' | 'edit';
  variants?: Variant[];
  onVariantsChange?: (variants: Variant[]) => void;
}) {
  const t = useT();
  const [uncontrolledVariants, setUncontrolledVariants] = useState<Variant[]>([]);
  const variants = controlledVariants ?? uncontrolledVariants;
  const setVariants = (next: Variant[] | ((prev: Variant[]) => Variant[])) => {
    const resolved = typeof next === 'function' ? next(variants) : next;
    if (!controlledVariants) {
      setUncontrolledVariants(resolved);
    }
    onVariantsChange?.(resolved);
  };
  const [activeTab, setActiveTab] = useState('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newVariant, setNewVariant] = useState<Omit<Variant, 'id'>>({
    size: '',
    color: '',
    onHand: '',
    price: '',
    available: 'Yes',
  });

  const sizeOptions = ['39', '40', '41', '42', '43', '44', '45'];
  const colorOptions = ['White', 'Black', 'Red', 'Blue', 'Green'];
  const availableOptions = ['Yes', 'No'];

  const resetForm = () => {
    setNewVariant({
      size: '',
      color: '',
      onHand: '',
      price: '',
      available: 'Yes',
    });
    setEditingId(null);
  };

  const handleAddVariant = () => {
    if (
      !newVariant.size ||
      !newVariant.color ||
      !newVariant.onHand ||
      !newVariant.price
    ) {
      toast.error(t('Size, color, on hand, and price are required'));
      return;
    }
    const onHand = Number(newVariant.onHand);
    const price = Number(newVariant.price);
    if (!Number.isFinite(onHand) || onHand < 0) {
      toast.error(t('On hand must be zero or greater'));
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error(t('Variant price cannot be negative'));
      return;
    }
    const duplicate = variants.some(
      (v) =>
        v.id !== editingId &&
        v.size === newVariant.size &&
        v.color === newVariant.color,
    );
    if (duplicate) {
      toast.error(t('Variant {size} / {color} already exists', { size: newVariant.size, color: newVariant.color }));
      return;
    }

    if (editingId) {
      setVariants((prev) =>
        prev.map((v) => (v.id === editingId ? { ...v, ...newVariant } : v)),
      );

      toast.custom(
        (toastId) => (
          <Alert
            variant="mono"
            icon="success"
            onClose={() => toast.dismiss(toastId)}
          >
            <AlertIcon>
              <CheckCircle />
            </AlertIcon>
            <AlertTitle>{t('Variant updated successfully')}</AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );

      setEditingId(null);
    } else {
      const variant: Variant = {
        id: `new-${crypto.randomUUID()}`,
        ...newVariant,
      };
      setVariants([...variants, variant]);

      toast.custom(
        (toastId) => (
          <Alert
            variant="mono"
            icon="success"
            onClose={() => toast.dismiss(toastId)}
          >
            <AlertIcon>
              <CheckCircle />
            </AlertIcon>
            <AlertTitle>{t('Variant added successfully')}</AlertTitle>
          </Alert>
        ),
        {
          duration: 5000,
        },
      );
    }

    resetForm();
    setActiveTab('list');
  };

  const handleDeleteVariant = (id: string) => {
    setVariants(variants.filter((variant) => variant.id !== id));

    toast.custom(
      (toastId) => (
        <Alert variant="mono" icon="success" onClose={() => toast.dismiss(toastId)}>
          <AlertIcon>
            <CheckCircle />
          </AlertIcon>
          <AlertTitle>{t('Variant deleted successfully')}</AlertTitle>
        </Alert>
      ),
      {
        duration: 5000,
      },
    );
  };

  const handleEditVariant = (id: string) => {
    const variant = variants.find((v) => v.id === id);
    if (variant) {
      setNewVariant({
        size: variant.size,
        color: variant.color,
        onHand: variant.onHand,
        price: variant.price,
        available: variant.available,
      });
      setEditingId(id);
      setActiveTab('form');
    }
  };

  return (
    <div className="space-y-5">
      {/* Variants */}
      <Card className="rounded-md">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full p-0"
        >
          <CardHeader className="min-h-[40px] bg-accent/50">
            <CardTitle className="text-sm">{t('Variants')}</CardTitle>
            <TabsList
              size="xs"
              className="flex gap-3.5 border-none"
              variant="line"
            >
              <TabsTrigger
                value="list"
                className="flex-1 pb-3 -mb-1.5 data-[state=active]:text-foreground text-muted-foreground data-[state=active]:border-foreground border-b-[1px] hover:text-inherit"
              >
                {t('Variants')}
              </TabsTrigger>
              <TabsTrigger
                value="form"
                className="flex-1 pb-3 -mb-1.5 gap-3 data-[state=active]:text-foreground text-muted-foreground data-[state=active]:border-foreground border-b-[1px] hover:text-inherit"
              >
                {editingId ? t('Edit Variant') : t('Add New')}
              </TabsTrigger>
              <Settings className="size-4 -me-px text-muted-foreground" />
            </TabsList>
          </CardHeader>

          <CardContent className="p-0 m-0">
            <TabsContent value="list" className="p-0 m-0 flex flex-col">
              {variants.length === 0 ? (
                <div className="p-10">
                  <h3 className="text-foreground font-medium leading-7">
                    {t('No variants to display')}
                  </h3>
                  <span className="text-xs font-normal text-secondary-foreground">
                    {t('Set up different options for this product')}
                  </span>
                  <div className="mt-3.5">
                    <Button
                      size="sm"
                      variant="mono"
                      onClick={() => setActiveTab('form')}
                    >
                      <Plus className="mr-2" />
                      {t('Add Variant')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="text-secondary-foreground font-normal border-border/60 text-2sm">
                      <TableHead className="min-w-[80px] w-[100px] h-8.5 border-e border-border/60 ps-5">
                        {t('Size')}
                      </TableHead>
                      <TableHead className="min-w-[80px] w-[100px] h-8.5 border-e border-border/60">
                        {t('Color')}
                      </TableHead>
                      <TableHead className="min-w-[80px] w-[100px] h-8.5 border-e border-border/60">
                        {t('Price')}
                      </TableHead>
                      <TableHead className="min-w-[80px] w-[100px] h-8.5 border-e border-border/60 ps-5">
                        {t('Available')}
                      </TableHead>
                      <TableHead className="min-w-[90px] w-[100px] h-8.5 border-e border-border">
                        {t('Display qty')}
                      </TableHead>
                      <TableHead className="w-[100px] h-8.5">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((variant, index) => (
                      <TableRow
                        key={variant.id}
                        className={`text-secondary-foreground font-normal border-0 text-2sm ${index % 2 === 0 ? 'bg-accent/50' : ''}`}
                      >
                        <TableCell className="py-1 border-e border-border/60 ps-5">
                          EU {variant.size}
                        </TableCell>
                        <TableCell className="py-1 border-e border-border/60">
                          {t(variant.color)}
                        </TableCell>
                        <TableCell className="py-1 border-e border-border/60">
                          {formatMoney(variant.price)}
                        </TableCell>
                        <TableCell className="py-1 border-e border-border/60">
                          <span className="px-2 py-1 rounded-full text-xs">
                            {t(variant.available)}
                          </span>
                        </TableCell>
                        <TableCell className="py-1 border-e border-border/60">
                          {variant.onHand}
                        </TableCell>
                        <TableCell className="py-1 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVariant(variant.id)}
                            >
                              <ClipboardPenLine className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVariant(variant.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="form" className="m-0 space-y-4">
              <div className="p-5 space-y-4">
                <div className="flex flex-row items-center gap-5">
                  <div className="flex flex-col gap-2 basis-2/5">
                    <Label className="text-xs">{t('Size')}</Label>
                    <Select
                      value={newVariant.size}
                      indicatorPosition="right"
                      onValueChange={(value) =>
                        setNewVariant({ ...newVariant, size: value })
                      }
                    >
                      <SelectTrigger className="text-start">
                        <SelectValue placeholder={t('Select Size')} />
                      </SelectTrigger>
                      <SelectContent>
                        {sizeOptions.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2 basis-2/5">
                    <Label className="text-xs">{t('Color')}</Label>
                    <Select
                      value={newVariant.color}
                      indicatorPosition="right"
                      onValueChange={(value) =>
                        setNewVariant({ ...newVariant, color: value })
                      }
                    >
                      <SelectTrigger className="text-start">
                        <SelectValue placeholder={t('Select Color')} />
                      </SelectTrigger>
                      <SelectContent>
                        {colorOptions.map((color) => (
                          <SelectItem key={color} value={color}>
                            {t(color)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2 basis-1/5">
                    <Label className="text-xs">{t('Display qty')}</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={newVariant.onHand}
                      onChange={(e) =>
                        setNewVariant({ ...newVariant, onHand: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-2 basis-2/5">
                    <Label className="text-xs">{t('Price')}</Label>
                    <InputWrapper>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={newVariant.price}
                        onChange={(e) =>
                          setNewVariant({
                            ...newVariant,
                            price: e.target.value,
                          })
                        }
                      />
                      <span className="text-xs text-muted-foreground">{APP_CURRENCY}</span>
                    </InputWrapper>
                  </div>

                  <div className="flex flex-col gap-2 basis-1/4">
                    <Label className="text-xs">{t('Available')}</Label>
                    <Select
                      value={newVariant.available}
                      indicatorPosition="right"
                      onValueChange={(value) =>
                        setNewVariant({ ...newVariant, available: value })
                      }
                    >
                      <SelectTrigger className="text-start">
                        <SelectValue placeholder={t('Availability')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {t(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={resetForm}>
                    {editingId ? t('Cancel') : t('Clear')}
                  </Button>
                  <Button variant="mono" onClick={handleAddVariant}>
                    {editingId ? t('Update Variant') : t('Add Variant')}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
