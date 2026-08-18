'use client';

import { useEffect, useId, useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { toAbsoluteUrl } from '@/lib/helpers';
import {
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/store-inventory/hooks/use-inventory';
import type { CategoryListRow } from '@/store-inventory/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

function iconFileName(icon?: string | null) {
  if (!icon) return null;
  if (icon.startsWith('data:') || icon.startsWith('blob:')) return null;
  return icon.includes('/') ? (icon.split('/').pop() as string) : icon;
}

function CategoryImageUpload({
  mode,
  icon,
  previewUrl,
  onPreviewChange,
  inputId,
}: {
  mode: 'new' | 'edit';
  icon: string | null;
  previewUrl: string | null;
  onPreviewChange: (url: string | null) => void;
  inputId: string;
}) {
  const isNewMode = mode === 'new';
  const isEditMode = mode === 'edit';
  const bundledIcon = iconFileName(icon);
  const hasPreview = Boolean(previewUrl);
  const hasImage = hasPreview || Boolean(bundledIcon);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onPreviewChange(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="w-full h-[200px] bg-accent/50 border border-border rounded-lg flex items-center justify-center">
          {hasImage ? (
            <div className="relative flex items-center justify-center w-full h-full">
              {hasPreview ? (
                <img
                  src={previewUrl ?? undefined}
                  alt="Category"
                  className={
                    isEditMode
                      ? 'cursor-pointer h-[140px] object-contain'
                      : 'w-full h-full object-cover rounded-lg'
                  }
                />
              ) : (
                <>
                  <img
                    src={toAbsoluteUrl(`/media/store/client/icons/light/${bundledIcon}`)}
                    className="cursor-pointer h-[140px] object-contain dark:hidden"
                    alt="light-icon"
                  />
                  <img
                    src={toAbsoluteUrl(`/media/store/client/icons/dark/${bundledIcon}`)}
                    className="cursor-pointer h-[140px] object-contain light:hidden"
                    alt="dark-icon"
                  />
                </>
              )}

              {isNewMode && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 size-6"
                  onClick={() => onPreviewChange(null)}
                >
                  <X className="size-3" />
                </Button>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id={inputId}
              />
              <label htmlFor={inputId} className="absolute bottom-3 right-3">
                <Button size="sm" variant="outline" asChild>
                  <span>{isEditMode ? 'Change' : 'Upload'}</span>
                </Button>
              </label>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <ImageIcon className="size-[35px] text-muted-foreground" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id={inputId}
              />
              <label htmlFor={inputId} className="absolute bottom-3 right-3">
                <Button size="sm" variant="outline" asChild>
                  <span>Upload</span>
                </Button>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CategoryFormSheet({
  mode,
  open,
  onOpenChange,
  category,
}: {
  mode: 'new' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryListRow;
}) {
  const isNewMode = mode === 'new';
  const isEditMode = mode === 'edit';
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const imageInputId = useId();
  const featuredId = useId();

  const [categoryName, setCategoryName] = useState('');
  const [status, setStatus] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [icon, setIcon] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategoryName(category?.productInfo.title ?? '');
    setStatus(category?.status.label.toLowerCase() || 'active');
    setDescription(category?.description ?? '');
    setIsFeatured(Boolean(category?.featured));
    setIcon(iconFileName(category?.productInfo.image) ?? (isNewMode ? null : 'running-shoes.svg'));
    setPreviewUrl(null);
  }, [open, category, isNewMode]);

  const isPending =
    createCategory.isPending || updateCategory.isPending || deleteCategory.isPending;

  const persistIcon = iconFileName(icon) ?? 'running-shoes.svg';

  const handleSave = async () => {
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }
    const nextStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Active';
    try {
      if (isEditMode) {
        if (!category?.id) {
          toast.error('Select a category to edit');
          return;
        }
        await updateCategory.mutateAsync({
          id: category.id,
          input: {
            name: categoryName.trim(),
            status: nextStatus,
            featured: isFeatured,
            description,
            icon: persistIcon,
          },
        });
      } else {
        await createCategory.mutateAsync({
          name: categoryName.trim(),
          status: nextStatus,
          featured: isFeatured,
          description,
          icon: persistIcon,
        });
      }
      toast.success(isNewMode ? 'Category created' : 'Category saved');
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

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 w-[500px] p-0 inset-5 border start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b py-4 px-6">
          <SheetTitle className="font-medium">
            {isNewMode ? 'Add Category' : 'Edit Category'}
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0 grow pt-5">
          <ScrollArea
            className="h-[calc(100dvh-14rem)] mx-1.5 px-3.5 grow"
            viewportClassName="[&>div]:h-full [&>div>div]:h-full"
          >
            <div className="space-y-6">
              <CategoryImageUpload
                mode={mode}
                icon={icon}
                previewUrl={previewUrl}
                onPreviewChange={setPreviewUrl}
                inputId={imageInputId}
              />

              <div className="space-y-2">
                <Label className="text-xs font-medium">Category Name</Label>
                <Input
                  placeholder="Category Name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  placeholder="Category Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={featuredId}
                  checked={isFeatured}
                  onCheckedChange={(checked) => setIsFeatured(checked as boolean)}
                />
                <Label htmlFor={featuredId} className="text-xs font-medium">
                  Featured
                </Label>
              </div>
            </div>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="border-t p-5">
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="ghost" onClick={handleClose} disabled={isPending}>
              Close
            </Button>
            {isEditMode && (
              <Button variant="outline" onClick={handleDelete} disabled={isPending}>
                Delete
              </Button>
            )}
            <Button variant="mono" onClick={handleSave} disabled={isPending}>
              {isNewMode ? 'Create' : 'Save'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
