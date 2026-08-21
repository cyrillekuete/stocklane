'use client';

import { useT } from '@/i18n/use-t';
import { toAbsoluteUrl } from '@/lib/helpers';

export function ScreenLoader() {
  const t = useT();

  return (
    <div className="flex flex-col items-center gap-2 justify-center fixed inset-0 z-50 transition-opacity duration-700 ease-in-out">
      <img
        className="h-[30px] max-w-none"
        src={toAbsoluteUrl('/media/app/mini-logo.svg')}
        alt="logo"
      />
      <div className="text-muted-foreground font-medium text-sm">
        {t('Loading...')}
      </div>
    </div>
  );
}
