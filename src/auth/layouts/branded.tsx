import { Link, Outlet } from 'react-router-dom';
import { useT } from '@/i18n/use-t';
import { LanguageSwitcher } from '@/i18n/components/language-switcher';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';

export function BrandedLayout() {
  const t = useT();

  return (
    <div className="grid lg:grid-cols-2 grow min-h-screen">
      <div className="flex justify-center items-center p-8 lg:p-10 order-2 lg:order-1">
        <Card className="w-full max-w-[400px]">
          <CardContent className="p-6">
            <div className="flex justify-end mb-4">
              <LanguageSwitcher />
            </div>
            <Outlet />
          </CardContent>
        </Card>
      </div>

      <div className="lg:rounded-xl lg:border lg:border-border lg:m-5 order-1 lg:order-2 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.45),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.35),transparent_40%)]" />
        <div className="relative flex flex-col p-8 lg:p-16 gap-4 h-full min-h-[240px]">
          <Link to="/">
            <img
              src={toAbsoluteUrl('/media/app/mini-logo.svg')}
              className="h-[28px] max-w-none brightness-0 invert"
              alt="Stocklane"
            />
          </Link>

          <div className="flex flex-col gap-3 mt-auto mb-auto">
            <h3 className="text-2xl font-semibold text-white">{t('Secure store access')}</h3>
            <div className="text-base font-medium text-slate-200/90">
              {t(
                'Sign in to manage inventory, point of sale, and warehouse operations with role-based access for Admin, Cashier, and Store Keeper.',
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
