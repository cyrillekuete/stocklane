'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input, InputAddon, InputGroup } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from "@/components/ui/separator";
import { toAbsoluteUrl } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from '@/i18n/use-t';
import { LOGO_MAX_CHARS, STORE_STATUSES } from "@/store-inventory/lib/settings-validation";
import { useSettingsForm } from "../../settings-form-context";
import { FieldError } from "../number-field";

const countries = [
  { code: "US", name: "United States", dialCode: "+1", flag: "/media/flags/usa.svg" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "/media/flags/united-kingdom.svg" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "/media/flags/canada.svg" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "/media/flags/australia.svg" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "/media/flags/germany.svg" },
  { code: "FR", name: "France", dialCode: "+33", flag: "/media/flags/france.svg" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "/media/flags/italy.svg" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "/media/flags/spain.svg" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "/media/flags/netherlands.svg" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "/media/flags/belgium.svg" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "/media/flags/switzerland.svg" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "/media/flags/austria.svg" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "/media/flags/sweden.svg" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "/media/flags/norway.svg" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "/media/flags/denmark.svg" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "/media/flags/finland.svg" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "/media/flags/poland.svg" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", flag: "/media/flags/czech-republic.svg" },
  { code: "HU", name: "Hungary", dialCode: "+36", flag: "/media/flags/hungary.svg" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "/media/flags/portugal.svg" },
  { code: "GR", name: "Greece", dialCode: "+30", flag: "/media/flags/greece.svg" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "/media/flags/turkey.svg" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "/media/flags/japan.svg" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "/media/flags/south-korea.svg" },
  { code: "CN", name: "China", dialCode: "+86", flag: "/media/flags/china.svg" },
  { code: "IN", name: "India", dialCode: "+91", flag: "/media/flags/india.svg" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "/media/flags/singapore.svg" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "/media/flags/brazil.svg" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "/media/flags/mexico.svg" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "/media/flags/south-africa.svg" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "/media/flags/united-arab-emirates.svg" },
];

export const checkoutCountries = countries.map(({ code, name }) => ({ code, name }));

function toDateInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function fromDateInputValue(value: string) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}
function logoSrc(logo: string | null) {
  if (!logo) return toAbsoluteUrl('/media/avatars/300-1.png');
  if (logo.startsWith('data:') || logo.startsWith('blob:') || logo.startsWith('http')) return logo;
  return toAbsoluteUrl(logo.startsWith('/') ? logo : `/media/avatars/${logo}`);
}

function PhoneNumberInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const findCountryByPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber.startsWith("+")) return null;
    const sortedCountries = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
    return sortedCountries.find((country) => phoneNumber.startsWith(country.dialCode));
  };

  const currentCountry = findCountryByPhoneNumber(value) || countries.find((country) => country.code === 'FR') || countries[0];

  const handlePhoneChange = (inputValue: string) => {
    const cleanValue = inputValue.replace(/[^\d+\s\-().]/g, "");
    onChange(cleanValue);
  };

  return (
    <div className="flex items-center w-full">
      <div className="flex items-center justify-center w-9 h-8.5 rounded-s-md border border-r-0 border-input shadow-xs shadow-black/5">
        <img
          src={toAbsoluteUrl(currentCountry.flag)}
          alt={`${currentCountry.name} flag`}
          className="size-4 object-cover rounded-full"
        />
      </div>
      <Input
        type="tel"
        placeholder="+33"
        value={value}
        onChange={(e) => handlePhoneChange(e.target.value)}
        className="rounded-l-none flex-1"
      />
    </div>
  );
}

export function Basics() {
  const t = useT();
  const { draft, updateDraft, fieldErrors } = useSettingsForm();
  const [tagsText, setTagsText] = useState<string | null>(null);
  const tagsFocusedRef = useRef(false);
  const tagsJoined = draft.tags.join(', ');

  useEffect(() => {
    if (!tagsFocusedRef.current) {
      setTagsText(null);
    }
  }, [tagsJoined]);

  const commitTags = (raw: string) => {
    updateDraft({
      tags: raw
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('Please upload an image file'));
      event.target.value = '';
      return;
    }
    // Base64 expands ~4/3; keep under LOGO_MAX_CHARS after encoding.
    if (file.size > LOGO_MAX_CHARS * 0.7) {
      toast.error(t('Logo is too large (max ~500KB)'));
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result.length > LOGO_MAX_CHARS) {
        toast.error(t('Logo is too large (max ~500KB)'));
        return;
      }
      updateDraft({ logo: result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="bg-accent/70 rounded-md shadow-none h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Basics')}</h3>
        <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-5 h-full">
          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label htmlFor="settings-store-name" className="text-2sm font-medium shrink-0">{t('Company Name')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('Store name shown across the app')}</span>
            </div>
            <div className="basis-2/3 space-y-1.5">
              <Input
                id="settings-store-name"
                placeholder="Bob’s Shoes Store"
                value={draft.storeName}
                onChange={(e) => updateDraft({ storeName: e.target.value })}
                aria-invalid={Boolean(fieldErrors.storeName)}
              />
              <FieldError message={fieldErrors.storeName} />
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label htmlFor="settings-store-code" className="text-2sm font-medium shrink-0">{t('Store Code')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('Unique identifier shown in the header')}</span>
            </div>
            <div className="basis-2/3 space-y-1.5">
              <Input
                id="settings-store-code"
                placeholder="583920-XT"
                value={draft.storeCode}
                onChange={(e) => updateDraft({ storeCode: e.target.value })}
                aria-invalid={Boolean(fieldErrors.storeCode)}
              />
              <FieldError message={fieldErrors.storeCode} />
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-2sm font-medium shrink-0">{t('Store Status')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('Badge shown next to the store name')}</span>
            </div>
            <div className="basis-2/3 space-y-1.5">
              <Select value={draft.status} onValueChange={(status) => updateDraft({ status })} indicatorPosition="right">
                <SelectTrigger aria-invalid={Boolean(fieldErrors.status)}>
                  <SelectValue placeholder={t('Select status')} />
                </SelectTrigger>
                <SelectContent>
                  {STORE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={fieldErrors.status} />
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label htmlFor="settings-established" className="text-2sm font-medium shrink-0">{t('Established date')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('Date shown in the header')}</span>
            </div>
            <div className="basis-2/3 space-y-1.5">
              <Input
                id="settings-established"
                type="date"
                value={toDateInputValue(draft.establishedAt)}
                onChange={(e) => updateDraft({ establishedAt: fromDateInputValue(e.target.value) })}
                aria-invalid={Boolean(fieldErrors.establishedAt)}
              />
              <FieldError message={fieldErrors.establishedAt} />
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-2sm font-medium shrink-0">{t('Profile Image')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('Store logo or brand icon')}</span>
            </div>
            <div className="basis-2/3">
              <div className="flex items-center gap-2.5">
                <div className="w-[60px] h-[60px] border border-border/50 rounded-lg flex items-center justify-center">
                  <img
                    src={logoSrc(draft.logo)}
                    alt={t('Profile')}
                    className="rounded-lg size-[60px] object-contain"
                  />
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="profile-image-upload"
                />
                <label htmlFor="profile-image-upload" className="ml-2.5">
                  <Button size="sm" variant="outline" asChild>
                    <span>{t('Upload')}</span>
                  </Button>
                </label>
                <Button variant="ghost" size="sm" onClick={() => updateDraft({ logo: null })}>
                  {t('Delete')}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-2sm font-medium shrink-0">{t('Store URL')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('Link to your online store')}</span>
            </div>
            <InputGroup className="basis-2/3">
              <InputAddon>https://</InputAddon>
              <Input
                type="text"
                placeholder="bobs-shoes.store"
                value={draft.storeUrl ?? ''}
                onChange={(e) => updateDraft({ storeUrl: e.target.value })}
              />
            </InputGroup>
          </div>

          <Separator />

          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-2sm font-medium shrink-0">{t('Store Phone')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('Customer service phone number')}</span>
            </div>
            <div className="basis-2/3">
              <PhoneNumberInput
                value={draft.phone ?? ''}
                onChange={(phone) => updateDraft({ phone })}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5 lg:basis-1/3">
              <Label htmlFor="settings-contact-email" className="text-2sm font-medium shrink-0">{t('Contact Email')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('Email for customer inquiries')}</span>
            </div>
            <div className="basis-2/3 space-y-1.5">
              <Input
                id="settings-contact-email"
                placeholder="hello@mystore.io"
                type="email"
                value={draft.contactEmail ?? ''}
                onChange={(e) => updateDraft({ contactEmail: e.target.value })}
                aria-invalid={Boolean(fieldErrors.contactEmail)}
              />
              <FieldError message={fieldErrors.contactEmail} />
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label htmlFor="settings-tags" className="text-2sm font-medium shrink-0">{t('What do you do?')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('Tags describing store products')}</span>
            </div>
            <div className="basis-2/3">
              <Input
                id="settings-tags"
                placeholder={t('Start typing tags')}
                type="text"
                value={tagsText ?? tagsJoined}
                onChange={(e) => {
                  tagsFocusedRef.current = true;
                  setTagsText(e.target.value);
                }}
                onBlur={(e) => {
                  tagsFocusedRef.current = false;
                  commitTags(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
