'use client';

import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toAbsoluteUrl } from "@/lib/helpers";
import { useT } from '@/i18n/use-t';
import { useSettingsForm } from "../../../settings-form-context";

export function DigitalWallets() {
  const t = useT();
  const { draft, updateDraft } = useSettingsForm();

  const wallets = [
    {
      id: 'applePay' as const,
      name: 'Apple Pay',
      description: "Payments via Apple's wallet",
      logo: 'apple-pay.svg',
      enabled: draft.applePay,
    },
    {
      id: 'googlePay' as const,
      name: 'Google Pay',
      description: "Checkout with Google's wallet",
      logo: 'google-pay.svg',
      enabled: draft.googlePay,
    },
    {
      id: 'paypal' as const,
      name: 'Paypal',
      description: 'Pay securely with PayPal',
      logo: 'paypal-1.svg',
      enabled: draft.paypal,
    },
  ];

  return (
    <div className="space-y-0.5">
      {wallets.map((wallet) => (
        <Card
          key={wallet.id}
          className={`py-3 px-4 border-none shadow-none cursor-pointer ${
            wallet.id === 'applePay' ? 'rounded-b-none' :
            wallet.id === 'googlePay' ? 'rounded-none' :
            'rounded-t-none'
          } ${wallet.enabled ? 'bg-secondary' : 'bg-accent/50'}`}
          onClick={() => updateDraft({ [wallet.id]: !wallet.enabled })}
        >
          <div className="flex items-center gap-3.5">
            <Switch checked={wallet.enabled} size="sm" />
            <div className="flex items-center gap-3.5">
              <Card className="flex items-center justify-center rounded-md size-[36px] shadow-xs shrink-0">
                <div className="flex items-center justify-center bg-accent/70 rounded-md size-[30px]">
                  <img
                    src={toAbsoluteUrl(`/media/brand-logos/${wallet.logo}`)}
                    alt={wallet.name}
                    className="size-6 rounded-md"
                  />
                </div>
              </Card>
              <div>
                <h3 className="font-medium text-2sm text-foreground">{wallet.name}</h3>
                <p className="text-xs text-muted-foreground font-normal">{t(wallet.description)}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
