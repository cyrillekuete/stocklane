'use client';

import { Card } from "@/components/ui/card";
import { toAbsoluteUrl } from "@/lib/helpers";
import { Circle, CircleCheck } from "lucide-react";
import { useT } from '@/i18n/use-t';
import { useSettingsForm } from "../../../settings-form-context";

const paymentMethods = [
  { id: 'visa', name: 'Visa', description: 'Credit/Debit Cards', logo: 'visa.svg' },
  { id: 'mastercard', name: 'Mastercard', description: 'Credit/Debit Cards', logo: 'mastercard.svg' },
  { id: 'amex', name: 'American Express', description: 'Credit/Debit Cards', logo: 'american-express.svg' },
  { id: 'sepa', name: 'SEPA', description: 'EU Bank Transfer', logo: 'sepa.svg' },
  { id: 'ideal', name: 'Ideal', description: 'Dutch Payment Method', logo: 'ideal.svg' },
];

export function CardPayment() {
  const t = useT();
  const { draft, updateDraft } = useSettingsForm();

  const toggleMethod = (methodId: string) => {
    const selected = draft.cardMethods.includes(methodId)
      ? draft.cardMethods.filter((id) => id !== methodId)
      : [...draft.cardMethods, methodId];
    updateDraft({ cardMethods: selected });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      {paymentMethods.map((method) => (
        <Card
          key={method.id}
          className={`p-2 rounded-md cursor-pointer ${
            draft.cardMethods.includes(method.id) ? 'border-muted-foreground/40' : ''
          }`}
          onClick={() => toggleMethod(method.id)}
        >
          <div className="flex items-center justify-between mb-3">
            <Card className="flex items-center justify-center rounded-md size-[36px] shadow-xs shrink-0">
              <div className="flex items-center justify-center bg-accent/70 rounded-md size-[30px]">
                <img
                  src={toAbsoluteUrl(`/media/brand-logos/${method.logo}`)}
                  alt={method.name}
                  className="size-6 rounded-md"
                />
              </div>
            </Card>
            <div className="size-6 flex items-center justify-center">
              {draft.cardMethods.includes(method.id) ? (
                <CircleCheck className="fill-green-500 !text-background size-6" />
              ) : (
                <Circle className="size-5 text-muted-foreground/50"/>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-medium text-2sm text-foreground">{method.name}</h3>
            <span className="text-xs text-muted-foreground font-normal">{t(method.description)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
