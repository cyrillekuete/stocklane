'use client';

import { toAbsoluteUrl } from '@/lib/helpers';
import { useT } from '@/i18n/use-t';
import { isRemoteAsset } from '@/store-inventory/lib/format';
import { timezoneLabel } from '@/store-inventory/data/customer-profile';
import { Separator } from '@/components/ui/separator';
import { UserIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { CustomerListRow } from '@/store-inventory/types';

function avatarSrc(image?: string) {
  if (!image) return null;
  if (isRemoteAsset(image)) return image;
  return toAbsoluteUrl(`/media/avatars/${image}`);
}

export function Upload({ customer }: { customer?: CustomerListRow }) {
  const t = useT();
  const image = avatarSrc(customer?.customerInfo.image);
  const items = [
    { label: t('Company'), value: customer?.company || '—' },
    { label: t('Email'), value: customer?.customerInfo.label || '—' },
    { label: t('Phone No.'), value: customer?.phone || '—' },
    {
      label: t('Country'),
      value: customer?.location.name ? (
        <div className="flex items-center gap-1.5">
          <img
            src={toAbsoluteUrl(`/media/flags/${customer.location.flag}`)}
            alt={customer.location.name}
            className="w-4 h-4"
          />
          <span>{t(customer.location.name)}</span>
        </div>
      ) : (
        '—'
      ),
    },
    { label: t('Time Zone'), value: timezoneLabel(customer?.timezone, customer?.location.name) },
  ];

  return (
    <div className="space-y-5">
      <div className="w-full h-[240px] bg-accent/70 border border-border rounded-lg flex items-center justify-center">
        <div className="relative flex items-center justify-center w-full h-full">
          {image ? (
            <img src={image} alt={customer?.customerInfo.title} className="max-w-full max-h-full object-contain" />
          ) : (
            <UserIcon className="size-[40px] text-muted-foreground/60" />
          )}
        </div>
      </div>
      <div>
        {items.map((item, index) => (
          <div key={item.label}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-normal text-secondary-foreground/80">{item.label}</span>
              {item.label === t('Email') && customer?.customerInfo.label ? (
                <Link to={`mailto:${customer.customerInfo.label}`} className="text-2sm font-normal text-foreground hover:text-primary">
                  {item.value}
                </Link>
              ) : (
                <span className="text-2sm font-normal text-foreground">{item.value}</span>
              )}
            </div>
            {index < items.length - 1 && <Separator className="my-2.5" />}
          </div>
        ))}
      </div>
    </div>
  );
}
