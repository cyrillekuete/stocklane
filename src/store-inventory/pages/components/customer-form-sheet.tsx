'use client';

import { useEffect, useState } from 'react';
import { X, User } from 'lucide-react';
import { toast } from 'sonner';
import { toAbsoluteUrl } from '@/lib/helpers';
import { isRemoteAsset } from '@/store-inventory/lib/format';
import { mapCustomerError } from '@/store-inventory/lib/customer-errors';
import { locationProfile } from '@/store-inventory/data/customer-profile';
import { useCreateCustomer, useUpdateCustomer } from '@/store-inventory/hooks/use-inventory';
import type { CustomerListRow } from '@/store-inventory/types';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Country data for phone number input
const countries = [
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", dialCode: "+32", flag: "🇧🇪" },
  { code: "CH", name: "Switzerland", dialCode: "+41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dialCode: "+43", flag: "🇦🇹" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dialCode: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dialCode: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dialCode: "+358", flag: "🇫🇮" },
  { code: "PL", name: "Poland", dialCode: "+48", flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420", flag: "🇨🇿" },
  { code: "HU", name: "Hungary", dialCode: "+36", flag: "🇭🇺" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "GR", name: "Greece", dialCode: "+30", flag: "🇬🇷" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "HK", name: "Hong Kong", dialCode: "+852", flag: "🇭🇰" },
  { code: "TW", name: "Taiwan", dialCode: "+886", flag: "🇹🇼" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "PE", name: "Peru", dialCode: "+51", flag: "🇵🇪" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪" },
  { code: "IL", name: "Israel", dialCode: "+972", flag: "🇮🇱" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
];

// Customer Avatar Upload Component
function flagFile(countryName: string) {
  const map: Record<string, string> = {
    'United States': 'usa.svg',
    USA: 'usa.svg',
    'United Kingdom': 'united-kingdom.svg',
    Canada: 'canada.svg',
    Australia: 'australia.svg',
    France: 'france.svg',
    Italy: 'italy.svg',
    Spain: 'spain.svg',
    Netherlands: 'netherlands.svg',
    Poland: 'poland.svg',
    Russia: 'russia.svg',
    Japan: 'japan.svg',
    'South Korea': 'south-korea.svg',
    India: 'india.svg',
    Singapore: 'singapore.svg',
    Malaysia: 'malaysia.svg',
    Malaysiaa: 'malaysia.svg',
    Brazil: 'brazil.svg',
    Mexico: 'mexico.svg',
    Ireland: 'ireland.svg',
    Estonia: 'estonia.svg',
    Ukraine: 'ukraine.svg',
  };
  return map[countryName] ?? `${countryName.toLowerCase().replace(/\s+/g, '-')}.svg`;
}

function countryFromLocation(locationName?: string, phone?: string) {
  const byName = countries.find(
    (country) =>
      country.name === locationName ||
      (locationName === 'USA' && country.code === 'US') ||
      (locationName === 'Malaysiaa' && country.code === 'MY'),
  );
  if (byName) return byName;
  if (phone) {
    const match = countries.find((country) => phone.startsWith(country.dialCode));
    if (match) return match;
  }
  return countries[8];
}

function phoneNationalNumber(phone?: string, dialCode?: string) {
  if (!phone) return '';
  if (dialCode && phone.startsWith(dialCode)) return phone.slice(dialCode.length).trim();
  return phone.replace(/^\+\d+\s*/, '');
}

function avatarPreview(image?: string | null) {
  if (!image) return null;
  if (isRemoteAsset(image)) return image;
  return toAbsoluteUrl(`/media/avatars/${image}`);
}

function CustomerAvatarUpload({
  image,
  onChange,
}: {
  image: string | null;
  onChange: (value: string | null) => void;
}) {
  const preview = avatarPreview(image);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange((e.target?.result as string) || null);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="w-full h-[200px] bg-accent/50 border border-border rounded-lg flex items-center justify-center">
          {preview ? (
            <div className="relative flex items-center justify-center w-full h-full">
              <img src={preview} alt="Customer Avatar" className="w-full h-full object-cover rounded-lg" />
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 size-6"
                onClick={() => onChange(null)}
              >
                <X className="size-3" />
              </Button>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="customer-avatar-upload" />
              <label htmlFor="customer-avatar-upload" className="absolute bottom-3 right-3">
                <Button size="sm" variant="outline" asChild>
                  <span>Change</span>
                </Button>
              </label>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <User className="size-[35px] text-muted-foreground" />
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="customer-avatar-upload" />
              <label htmlFor="customer-avatar-upload" className="absolute bottom-3 right-3">
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

// Phone Number Input Component
function PhoneNumberInput({
  value,
  onChange,
  country,
  onCountryChange,
}: {
  value: string;
  onChange: (value: string) => void;
  country: (typeof countries)[number];
  onCountryChange: (country: (typeof countries)[number]) => void;
}) {
  const [open, setOpen] = useState(false);

  const handlePhoneChange = (inputValue: string) => {
    const cleanValue = inputValue.replace(/[^\d+]/g, '');
    if (cleanValue.startsWith('+')) {
      const matchedCountry = countries.find((item) => cleanValue.startsWith(item.dialCode));
      if (matchedCountry && matchedCountry.code !== country.code) {
        onCountryChange(matchedCountry);
        onChange(cleanValue.slice(matchedCountry.dialCode.length));
        return;
      }
    }
    onChange(cleanValue.startsWith('+') ? cleanValue : cleanValue);
  };

  return (
    <div className="flex items-center w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-24 items-center justify-between rounded-e-none border-e-0 bg-transparent"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-sm leading-none">{country.flag}</span>
              <span className="text-xs leading-none">{country.dialCode}</span>
            </span>
            <svg
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandList>
              <ScrollArea className="h-[300px]">
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {countries.map((item) => (
                    <CommandItem
                      key={item.code}
                      value={`${item.name} ${item.dialCode}`}
                      onSelect={() => {
                        onCountryChange(item);
                        setOpen(false);
                      }}
                    >
                      <span className="flex items-center gap-1.5 leading-none">
                        <span className="text-sm">{item.flag}</span>
                        <span className="text-sm text-foreground truncate">{item.name}</span>
                        <span className="text-sm text-muted-foreground">{item.dialCode}</span>
                      </span>
                      {country.code === item.code && <CommandCheck />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        type="tel"
        placeholder="Enter phone number"
        value={value}
        onChange={(e) => handlePhoneChange(e.target.value)}
        className="rounded-l-none flex-1"
      />
    </div>
  );
}

export function CustomerFormSheet({
  mode,
  open,
  onOpenChange,
  customer,
}: {
  mode: 'new' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerListRow;
}) {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isNewMode = mode === 'new';
  const isPending = createCustomer.isPending || updateCustomer.isPending;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [country, setCountry] = useState(countries[8]);

  useEffect(() => {
    if (!open) return;
    const nextCountry = countryFromLocation(customer?.location.name, customer?.phone);
    setFullName(customer?.customerInfo.title ?? '');
    setEmail(customer?.customerInfo.label ?? '');
    setStatus(customer?.status.label.toLowerCase() ?? '');
    setCompanyName(customer?.company ?? '');
    setTimeZone(customer?.timezone ?? locationProfile(customer?.location.name).timezone);
    setImage(customer?.customerInfo.image ?? null);
    setCountry(nextCountry);
    setPhoneNumber(phoneNationalNumber(customer?.phone, nextCountry.dialCode));
  }, [open, customer]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Enter a valid email address');
      return;
    }
    const nextStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Active';
    const locationName = country.name === 'United States' ? 'USA' : country.name;
    const payload = {
      name: fullName.trim(),
      email: trimmedEmail || undefined,
      status: nextStatus,
      image: image ?? undefined,
      phone: phoneNumber ? `${country.dialCode} ${phoneNumber}` : undefined,
      company: companyName || undefined,
      timezone: timeZone || undefined,
      locationName,
      locationFlag: flagFile(locationName),
      billingAddress: `${locationProfile(locationName).city}, ${locationName}`,
    };
    try {
      if (!isNewMode && customer?.id) {
        await updateCustomer.mutateAsync({ id: customer.id, input: payload });
      } else {
        await createCustomer.mutateAsync(payload);
      }
      toast.success(isNewMode ? 'Customer created' : 'Customer saved');
      onOpenChange(false);
    } catch (error) {
      toast.error(mapCustomerError(error).message);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 lg:w-[820px] sm:max-w-none inset-5 border start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        {/* Header */}
        <SheetHeader className="border-b py-3.5 px-5 border-border">
          <SheetTitle className="font-medium">
            {isNewMode ? 'New Customer' : 'Edit Customer'}
          </SheetTitle>
        </SheetHeader>

        {/* Body */}
        <SheetBody className="p-0 grow">
          <ScrollArea
            className="flex flex-col h-[calc(100dvh-10rem)] mx-1.5"
            viewportClassName="[&>div]:h-full [&>div>div]:h-full"
          >
            <div className="flex flex-wrap lg:flex-nowrap px-3.5 grow">
              {/* Left Section - Avatar Upload */}
              <div className="w-full shrink-0 lg:w-[280px] py-5 lg:pe-5 space-y-4">
                <CustomerAvatarUpload image={image} onChange={setImage} />
              </div>

              {/* Right Section - Form Fields */}
              <div className="grow lg:border-s border-border space-y-5 py-5 lg:ps-5">
                {/* Full Name */}
                <div className="flex items-center gap-10">
                  <Label className="text-xs font-medium w-24 shrink-0">Full Name</Label>
                  <Input
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="flex-1"
                  />
                </div>

                {/* Email */}
                <div className="flex items-center gap-10">
                  <Label className="text-xs font-medium w-24 shrink-0">Email</Label>
                  <Input
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                  />
                </div>

                {/* Phone Number */}
                <div className="flex items-center gap-10">
                  <Label className="text-xs font-medium w-24 shrink-0">Phone Number</Label>
                  <div className="flex-1">
                    <PhoneNumberInput
                      value={phoneNumber}
                      onChange={setPhoneNumber}
                      country={country}
                      onCountryChange={(next) => {
                        setCountry(next);
                        if (!timeZone) {
                          const locationName = next.name === 'United States' ? 'USA' : next.name;
                          setTimeZone(locationProfile(locationName).timezone);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-10">
                  <Label className="text-xs font-medium w-24 shrink-0">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Company Name */}
                <div className="flex items-center gap-10">
                  <Label className="text-xs font-medium w-24 shrink-0">Company Name</Label>
                  <Input
                    placeholder="Company Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="flex-1"
                  />
                </div>

                {/* Time Zone */}
                <div className="flex items-center gap-10">
                  <Label className="text-xs font-medium w-24 shrink-0">Time Zone</Label>
                  <Select value={timeZone} onValueChange={setTimeZone}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select Time Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="europe/amsterdam">Europe/Amsterdam</SelectItem>
                      <SelectItem value="europe/tallinn">Europe/Tallinn</SelectItem>
                      <SelectItem value="europe/kyiv">Europe/Kyiv</SelectItem>
                      <SelectItem value="europe/london">Europe/London</SelectItem>
                      <SelectItem value="europe/paris">Europe/Paris</SelectItem>
                      <SelectItem value="europe/madrid">Europe/Madrid</SelectItem>
                      <SelectItem value="europe/rome">Europe/Rome</SelectItem>
                      <SelectItem value="europe/warsaw">Europe/Warsaw</SelectItem>
                      <SelectItem value="europe/dublin">Europe/Dublin</SelectItem>
                      <SelectItem value="europe/moscow">Europe/Moscow</SelectItem>
                      <SelectItem value="america/new_york">America/New_York</SelectItem>
                      <SelectItem value="america/los_angeles">America/Los_Angeles</SelectItem>
                      <SelectItem value="america/toronto">America/Toronto</SelectItem>
                      <SelectItem value="america/mexico_city">America/Mexico_City</SelectItem>
                      <SelectItem value="america/sao_paulo">America/Sao_Paulo</SelectItem>
                      <SelectItem value="asia/tokyo">Asia/Tokyo</SelectItem>
                      <SelectItem value="asia/singapore">Asia/Singapore</SelectItem>
                      <SelectItem value="asia/seoul">Asia/Seoul</SelectItem>
                      <SelectItem value="asia/kolkata">Asia/Kolkata</SelectItem>
                      <SelectItem value="asia/kuala_lumpur">Asia/Kuala_Lumpur</SelectItem>
                      <SelectItem value="australia/sydney">Australia/Sydney</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetBody>

        {/* Footer */}
        <SheetFooter className="flex-row border-t pb-4 p-5 border-border gap-2.5 lg:gap-0">
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="mono" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : isNewMode ? 'Create' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
