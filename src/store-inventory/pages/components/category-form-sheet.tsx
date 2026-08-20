'use client';

import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/store-inventory/hooks/use-inventory';
import { mapCategoryError } from '@/store-inventory/lib/category-errors';
import { normalizeCategoryStatus } from '@/store-inventory/lib/category-validation';
import { uploadCategoryIcon } from '@/store-inventory/services/inventory';
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
import { CategoryDeleteDialog } from './category-delete-dialog';
import {
  CategoryIconFields,
  resolvePersistedCategoryIcon,
} from './category-icon-fields';

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
  const { data: categories = [] } = useCategories();
  const featuredId = useId();

  const [categoryName, setCategoryName] = useState('');
  const [status, setStatus] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [icon, setIcon] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategoryName(category?.productInfo.title ?? '');
    setStatus(category?.status.label.toLowerCase() || 'active');
    setDescription(category?.description ?? '');
    setIsFeatured(Boolean(category?.featured));
    setIcon(
      category?.productInfo.image
        ? resolvePersistedCategoryIcon(category.productInfo.image)
        : isNewMode
          ? 'running-shoes.svg'
          : 'running-shoes.svg',
    );
    setPreviewUrl(null);
    setPendingFile(null);
    setConfirmDeleteOpen(false);
  }, [open, category, isNewMode]);

  const isPending =
    createCategory.isPending ||
    updateCategory.isPending ||
    deleteCategory.isPending ||
    uploading;

  const resolveIconForSave = async () => {
    if (pendingFile) {
      setUploading(true);
      try {
        return await uploadCategoryIcon(pendingFile, category?.id);
      } finally {
        setUploading(false);
      }
    }
    return resolvePersistedCategoryIcon(icon);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }
    if (categoryName.trim().length > 80) {
      toast.error('Name must be 80 characters or fewer');
      return;
    }
    if (description.length > 500) {
      toast.error('Description must be 500 characters or fewer');
      return;
    }
    const nextStatus = normalizeCategoryStatus(status);
    try {
      let persistIcon: string;
      try {
        persistIcon = await resolveIconForSave();
      } catch (error) {
        toast.error(mapCategoryError(error, 'Unable to upload category icon').message);
        return;
      }
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
    } catch {
      // Mutation errors are toasted by the shared mutation hook.
    }
  };

  const handleConfirmDelete = async (reassignToCategoryId: string | null) => {
    if (!category?.id) {
      onOpenChange(false);
      return;
    }
    try {
      const result = await deleteCategory.mutateAsync({
        id: category.id,
        reassignToCategoryId,
      });
      if (result.reassigned) {
        toast.success('Category deleted and products reassigned');
      } else if (result.productCount > 0) {
        toast.success(
          `Category deleted. ${result.productCount} ${result.productCount === 1 ? 'product is' : 'products are'} now Uncategorized.`,
        );
      } else {
        toast.success('Category deleted');
      }
      setConfirmDeleteOpen(false);
      onOpenChange(false);
    } catch {
      // Error already toasted by mutation hook
    }
  };

  return (
    <>
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
                <CategoryIconFields
                  icon={icon}
                  previewUrl={previewUrl}
                  pendingFile={pendingFile}
                  onBundledIconChange={setIcon}
                  onFileSelected={(file, preview) => {
                    setPendingFile(file);
                    setPreviewUrl(preview);
                  }}
                  onClearPreview={() => {
                    setPendingFile(null);
                    setPreviewUrl(null);
                  }}
                />

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Category Name</Label>
                  <Input
                    placeholder="Category Name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    maxLength={80}
                  />
                </div>

                {isEditMode && category?.productInfo.label ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Code</Label>
                    <Input value={category.productInfo.label} disabled readOnly />
                    <p className="text-xs text-muted-foreground">
                      Codes are assigned on create and do not change when you rename a category.
                    </p>
                  </div>
                ) : null}

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
                    maxLength={500}
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
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                Close
              </Button>
              {isEditMode && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={isPending || !category?.id}
                >
                  Delete
                </Button>
              )}
              <Button variant="mono" onClick={handleSave} disabled={isPending}>
                {uploading ? 'Uploading…' : isNewMode ? 'Create' : 'Save'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <CategoryDeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        category={category}
        categories={categories}
        pending={deleteCategory.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
