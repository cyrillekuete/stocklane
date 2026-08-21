'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useT } from '@/i18n/use-t';
import { toAbsoluteUrl } from "@/lib/helpers";    
import { defaultPaymentMethods } from '@/store-inventory/data/customer-profile';
import type { CustomerPaymentMethod } from '@/store-inventory/types';
import { Link } from "react-router";

export function PaymentMethods({
  methods,
  customerName,
}: {
  methods?: CustomerPaymentMethod[];
  customerName?: string;
}) {
  const t = useT();
  const paymentMethods = methods?.length ? methods : defaultPaymentMethods(customerName || t('Customer'));
  return (
    <Card className="bg-accent/70 rounded-md shadow-none"> 
      <CardContent className="p-0"> 
        <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Payment Methods')}</h3>
        <div className="bg-background rounded-md m-1 mt-0 border border-input py-1 px-3.5">
          {paymentMethods.map((method, index) => (
            <div key={index}>
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                <div className="flex items-center justify-center rounded-md bg-background border border-border size-10 shrink-0">
                  <div className="flex items-center justify-center bg-accent/70 rounded-md size-[34px]">
                    <img
                      src={toAbsoluteUrl(
                        `/media/brand-logos/${method.logo}.svg`,
                      )} 
                      alt="image"
                      className={method.logo === "ideal" ? "size-6" : "size-7"}
                    />
                  </div>
                </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Link to={"#"} className="font-medium text-foreground text-sm hover:text-primary">{method.name}</Link>
                      {method.isPrimary && (
                        <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {t('Primary')}
                        </Badge>
                      )}
                    </div>
                    <span className="text-2sm font-normal text-secondary-foreground/70">{method.details}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  {t('Edit')}
                </Button>
              </div>
              {index < paymentMethods.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}