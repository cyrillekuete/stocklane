'use client';

import { useId } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { toAbsoluteUrl } from '@/lib/helpers';
import { isRemoteAsset, resolveCategoryIconSrc } from '@/store-inventory/lib/format';
import { CATEGORY_BUNDLED_ICONS } from '@/store-inventory/lib/category-validation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MAX_ICON_BYTES = 2 * 1024 * 1024;

export function resolvePersistedCategoryIcon(icon?: string | null) {
  if (!icon) return 'running-shoes.svg';
  if (isRemoteAsset(icon)) return icon;
  if (icon.startsWith('data:') || icon.startsWith('blob:')) return 'running-shoes.svg';
  return icon.includes('/') ? (icon.split('/').pop() as string) : icon;
}

export function CategoryIconFields({
  icon,
  previewUrl,
  pendingFile,
  onBundledIconChange,
  onFileSelected,
  onClearPreview,
  compact = false,
}: {
  icon: string | null;
  previewUrl: string | null;
  pendingFile: File | null;
  onBundledIconChange: (filename: string) => void;
  onFileSelected: (file: File, preview: string) => void;
  onClearPreview: () => void;
  compact?: boolean;
}) {
  const inputId = useId();
  const persisted = resolvePersistedCategoryIcon(icon);
  const displaySrc = previewUrl
    ? previewUrl
    : isRemoteAsset(persisted)
      ? persisted
      : null;
  const bundledName = isRemoteAsset(persisted) ? 'running-shoes.svg' : persisted;
  const heightClass = compact ? 'h-[160px]' : 'h-[200px]';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Choose an image file');
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      toast.error('Icon must be 2MB or smaller');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onFileSelected(file, String(reader.result ?? ''));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div className={`relative w-full ${heightClass} bg-accent/50 border border-border rounded-lg flex items-center justify-center overflow-hidden`}>
        {displaySrc ? (
          <img
            src={displaySrc}
            alt="Category"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <>
            <img
              src={toAbsoluteUrl(resolveCategoryIconSrc(bundledName, 'light'))}
              className="max-h-[140px] object-contain dark:hidden"
              alt="Category icon"
            />
            <img
              src={toAbsoluteUrl(resolveCategoryIconSrc(bundledName, 'dark'))}
              className="max-h-[140px] object-contain light:hidden"
              alt="Category icon"
            />
          </>
        )}
        {!displaySrc && !bundledName ? (
          <ImageIcon className="size-[35px] text-muted-foreground absolute" />
        ) : null}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id={inputId}
        />
        <label htmlFor={inputId} className="absolute bottom-3 right-3">
          <Button size="sm" variant="outline" asChild>
            <span>{pendingFile || displaySrc ? 'Replace' : 'Upload'}</span>
          </Button>
        </label>
        {pendingFile || previewUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2"
            onClick={onClearPreview}
          >
            Clear
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">Bundled icon</Label>
        <Select
          value={isRemoteAsset(persisted) || previewUrl ? undefined : bundledName}
          onValueChange={(value) => {
            onClearPreview();
            onBundledIconChange(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={previewUrl || isRemoteAsset(persisted) ? 'Custom upload' : 'Select icon'} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_BUNDLED_ICONS.map((name) => (
              <SelectItem key={name} value={name}>
                {name.replace(/\.svg$/i, '').replace(/-/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Uploads are saved to storage on Create/Save. Bundled icons stay as filenames.
        </p>
      </div>
    </div>
  );
}
