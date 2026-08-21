'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CircleX,
  CloudUpload,
  GripVertical,
  ImageIcon,
  TriangleAlert,
  XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n/use-t';
import { isRemoteAsset, resolveProductImageSrc } from '@/store-inventory/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase';
import { uploadProductImage } from '@/store-inventory/services/inventory';
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toAbsoluteUrl } from '@/lib/helpers';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
  storageUrl?: string;
}

interface DefaultImage {
  id: string;
  src: string;
  alt: string;
}

type SortableImage = ImageFile | DefaultImage;

interface ImageUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  className?: string;
  onImagesChange?: (images: ImageFile[]) => void;
  onUploadComplete?: (images: ImageFile[]) => void;
  image?: string;
  onImageChange?: (filename: string) => void;
}

// Sortable Image Item Component
function SortableImageItem({
  imageFile,
  onRemove,
  isDefault = false,
}: {
  imageFile: SortableImage;
  onRemove: (id: string) => void;
  isDefault?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: imageFile.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-center rounded-md bg-accent/50 shadow-none shrink-0 relative group border border-border',
        isDragging && 'opacity-50 z-50 cursor-grabbing transition-none',
      )}
    >
      <img
        src={
          isDefault
            ? (imageFile as { id: string; src: string; alt: string }).src
            : (imageFile as ImageFile).preview
        }
        className="h-[120px] object-cover rounded-md pointer-events-none"
        alt={
          isDefault
            ? (imageFile as { id: string; src: string; alt: string }).alt
            : (imageFile as ImageFile).file.name
        }
      />

      {/* Drag Handle */}
      <Button
        {...attributes}
        {...listeners}
        variant="outline"
        size="icon"
        className="shadow-sm absolute top-2 start-2 size-6 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing rounded-full"
      >
        <GripVertical className="size-3.5" />
      </Button>

      {/* Remove Button Overlay */}
      <Button
        onClick={() => onRemove(imageFile.id)}
        variant="outline"
        size="icon"
        className="shadow-sm absolute top-2 end-2 size-6 opacity-0 group-hover:opacity-100 rounded-full"
      >
        <XIcon className="size-3.5" />
      </Button>
    </div>
  );
}

function filenameFromSrc(src: string) {
  if (isRemoteAsset(src)) return src;
  const parts = src.split('/');
  return parts[parts.length - 1] || '11.png';
}

function primaryFilename(images: SortableImage[]) {
  const first = images[0];
  if (!first) return undefined;
  if (first.id.startsWith('default-')) {
    return filenameFromSrc((first as DefaultImage).src);
  }
  const uploaded = first as ImageFile;
  return uploaded.storageUrl || uploaded.file.name;
}

export function ProductFormImageUpload({ 
  mode,
  maxFiles = 5, 
  maxSize = 5 * 1024 * 1024, // 5MB 
  accept = 'image/*', 
  className, 
  onImagesChange, 
  onUploadComplete,
  image,
  onImageChange,
}: ImageUploadProps & { mode: 'new' | 'edit' }) {
  const t = useT();
  const isEditMode = mode === 'edit';

  const imageFromFilename = (filename: string): DefaultImage => {
    const resolved = resolveProductImageSrc(filename);
    return {
      id: 'default-primary',
      src: isRemoteAsset(resolved) ? resolved : toAbsoluteUrl(resolved),
      alt: t('Product image'),
    };
  };
  
  const [allImages, setAllImages] = useState<SortableImage[]>(
    image ? [imageFromFilename(image)] : isEditMode ? [
      {
        id: 'default-1',
        src: toAbsoluteUrl('/media/store/client/1200x1200/3.png'),
        alt: t('Product view 1'),
      },
    ] : []
  );
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced from 8 to make dragging more responsive
      },
    }),
  );

  // Ensure array never contains undefined items
  useEffect(() => {
    setAllImages((prev) => prev.filter((item) => item && item.id));
  }, []);

  useEffect(() => {
    if (!image) {
      if (!isEditMode) setAllImages([]);
      return;
    }
    setAllImages((prev) => {
      const current = prev.find((item) => item.id.startsWith('default-')) as DefaultImage | undefined;
      if (current && filenameFromSrc(current.src) === image) return prev;
      if (current && isRemoteAsset(image) && current.src === image) return prev;
      return [imageFromFilename(image), ...prev.filter((item) => !item.id.startsWith('default-'))];
    });
  }, [image, isEditMode]);

  // Manage cursor during drag operations
  useEffect(() => {
    if (activeId) {
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = '';
    }

    return () => {
      document.body.style.cursor = '';
    };
  }, [activeId]);

  const validateFile = useCallback((file: File, currentImagesCount: number): string | null => {
    if (!file.type.startsWith('image/')) {
      return t('File must be an image');
    }
    if (file.size > maxSize) {
      return t('File size must be less than {size}MB', { size: (maxSize / 1024 / 1024).toFixed(1) });
    }
    if (currentImagesCount >= maxFiles) {
      return t('Maximum {count} files allowed', { count: maxFiles });
    }
    return null;
  }, [maxSize, maxFiles, t]);

  const uploadImageFile = useCallback(async (imageFile: ImageFile) => {
    try {
      let storageUrl = imageFile.preview;
      if (isSupabaseConfigured) {
        storageUrl = await uploadProductImage(imageFile.file);
      }
      setAllImages((prev) => {
        const updatedImages = prev.map((img) =>
          img.id === imageFile.id
            ? { ...img, progress: 100, status: 'completed' as const, storageUrl }
            : img,
        );
        const primary = primaryFilename(updatedImages);
        if (primary) onImageChange?.(primary);

        const uploadedImages = updatedImages.filter((item): item is ImageFile =>
          !item.id.startsWith('default-'),
        );
        if (uploadedImages.every((img) => img.status === 'completed')) {
          onUploadComplete?.(uploadedImages);
        }
        return updatedImages;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('Upload failed');
      setErrors((prev) => [...prev, `${imageFile.file.name}: ${message}`]);
      setAllImages((prev) =>
        prev.map((img) =>
          img.id === imageFile.id
            ? { ...img, status: 'error' as const, error: message, progress: 0 }
            : img,
        ),
      );
    }
  }, [onImageChange, onUploadComplete, t]);

  const addImages = useCallback(
    (files: FileList | File[]) => {
      setAllImages((prevImages) => {
        const newImages: ImageFile[] = [];
        const newErrors: string[] = [];

        Array.from(files).forEach((file) => {
          const error = validateFile(file, prevImages.length);
          if (error) {
            newErrors.push(`${file.name}: ${error}`);
            return;
          }

          const imageFile: ImageFile = {
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
            progress: 30,
            status: 'uploading',
          };

          newImages.push(imageFile);
        });

        if (newErrors.length > 0) {
          setErrors((prev) => [...prev, ...newErrors]);
        }

        if (newImages.length > 0) {
          const updatedImages = [...prevImages, ...newImages];
          
          const uploadedImages = updatedImages.filter((item): item is ImageFile => 
            !item.id.startsWith('default-')
          );
          onImagesChange?.(uploadedImages);

          newImages.forEach((imageFile) => {
            void uploadImageFile(imageFile);
          });

          return updatedImages;
        }

        return prevImages;
      });
    },
    [validateFile, onImagesChange, uploadImageFile],
  );

  const removeImage = useCallback((id: string) => {
    setAllImages((prev) => {
      const imageItem = prev.find((img) => img.id === id);
      if (imageItem && !id.startsWith('default-')) {
        URL.revokeObjectURL((imageItem as ImageFile).preview);
      }
      const next = prev.filter((img) => img.id !== id);
      const filename = primaryFilename(next);
      if (filename) onImageChange?.(filename);
      return next;
    });
  }, [onImageChange]);

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      const activeId = active.id as string;
      const overId = over?.id as string;

      setAllImages((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === activeId);
        const newIndex = prev.findIndex((item) => item.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const next = arrayMove(prev, oldIndex, newIndex);
          const filename = primaryFilename(next);
          if (filename) onImageChange?.(filename);
          return next;
        }
        return prev;
      });
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        addImages(files);
      }
    },
    [addImages],
  );

  const openFileDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = accept;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        addImages(target.files);
      }
    };
    input.click();
  }, [accept, addImages]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return t('0 Bytes');
    const k = 1024;
    const sizes = [t('Bytes'), t('KB'), t('MB'), t('GB')];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get all sortable items - filter out any undefined items
  const allSortableItems: SortableImage[] = allImages.filter(
    (item) => item && item.id,
  );

  return (
    <div className={cn('w-full max-w-4xl', className)}>
      {/* Image Grid with Drag and Drop */}
      <div className="mb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[]}
        >
          <SortableContext
            items={allSortableItems.map((item) => item.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-2.5 transition-all duration-200 ease-in-out">
              {allSortableItems.map((item) =>
                item && item.id ? (
                  <SortableImageItem
                    key={item.id}
                    imageFile={item}
                    onRemove={removeImage}
                    isDefault={item.id.startsWith('default-')}
                  />
                ) : null,
              )}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              <div className="flex items-center justify-center rounded-md bg-accent/40 shadow-lg border border-border opacity-90">
                <img
                  src={(() => {
                    const item = allSortableItems.find(
                      (item) => item.id === activeId,
                    );
                    if (!item) return '';
                    return item.id.startsWith('default-')
                      ? (item as DefaultImage).src
                      : (item as ImageFile).preview;
                  })()}
                  className="h-[120px] w-full object-cover rounded-md pointer-events-none"
                  alt={t('Dragged item')}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Upload Progress Cards */}
        {allImages.some(item => !item.id.startsWith('default-')) && (
          <div className="mt-6 space-y-3">
            {allImages
              .filter((item): item is ImageFile => !item.id.startsWith('default-'))
              .map((imageFile) => (
              <Card
                key={imageFile.id}
                className="bg-accent/20 shadow-none rounded-md"
              >
                <CardContent className="flex items-center gap-2 p-3">
                  <div className="flex items-center justify-center size-[32px] rounded-md border border-border shrink-0">
                    <ImageIcon className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center justify-between gap-2.5 -mt-2 w-full">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-foreground font-medium leading-none">
                          {imageFile.file.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal leading-none">
                          {formatBytes(imageFile.file.size)}
                        </span>
                        {imageFile.status === 'uploading' && (
                          <p className="text-xs text-muted-foreground">
                            {t('Uploading... {pct}%', { pct: Math.round(imageFile.progress) })}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => removeImage(imageFile.id)}
                        variant="ghost"
                        size="icon"
                        className="size-6"
                      >
                        <CircleX className="size-3.5" />
                      </Button>
                    </div>

                    <Progress
                      value={imageFile.progress}
                      className={cn(
                        'h-1 transition-all duration-300',
                        '[&>div]:bg-zinc-950',
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Area */}
      <Card
        className={cn(
          'border-dashed shadow-none rounded-md bg-accent/20 transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardContent className="text-center">
          <div className="flex items-center justify-center size-[32px] rounded-full border border-border mx-auto mb-3">
            <CloudUpload className="size-4" />
          </div>
          <h3 className="text-2sm text-foreground font-semibold mb-0.5">
            {t('Choose a file or drag & drop here.')}
          </h3>
          <span className="text-xs text-secondary-foreground font-normal block mb-3">
            {t('JPEG, PNG, up to {size}.', { size: formatBytes(maxSize) })}
          </span>
          <Button size="sm" variant="mono" onClick={openFileDialog}>
            {t('Browse File')}
          </Button>
        </CardContent>
      </Card>
      
      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive" appearance="light" className="mt-5">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>{t('File upload error(s)')}</AlertTitle>
            <AlertDescription>
              {errors.map((error, index) => (
                <p key={index} className="last:mb-0">
                  {error}
                </p>
              ))}
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}
    </div>
  );
}
