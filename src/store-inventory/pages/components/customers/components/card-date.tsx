/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { toAbsoluteUrl } from "@/lib/helpers";
import { Link } from "react-router";
import { defaultCustomerReviews } from '@/store-inventory/data/customer-profile';
import type { CustomerReviewGroup } from '@/store-inventory/types';
import { Rating } from "@/components/ui/rating";
import { Separator } from "@/components/ui/separator";
import { useT } from '@/i18n/use-t';

export function CardDate({ reviews }: { reviews?: CustomerReviewGroup[] }) {
  const t = useT();
  const cardData = reviews?.length ? reviews : defaultCustomerReviews;  
  return (
    <div className="grid xl:grid-cols-2 gap-5">
      <TooltipProvider>
        {cardData.map((card, cardIndex) => (
          <Card key={cardIndex} className="bg-accent/70 rounded-md shadow-none h-full"> 
            <CardContent className="p-0 h-full flex flex-col"> 
              <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{card.date}</h3>
              <div className="bg-background h-full rounded-md m-1 mt-0 border border-input p-5 px-3.5">
                {card.orders.map((order, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Card className="flex items-center justify-center rounded-md bg-accent/50 h-[40px] w-[50px] shadow-none shrink-0">
                          <img
                            src={toAbsoluteUrl(`/media/store/client/1200x1200/${order.image}`)}
                            className="cursor-pointer h-[40px]"
                            alt="image"
                          />
                        </Card>

                        <div className="flex flex-col gap-1">
                          {order.product.includes('…') || order.product.includes('...') ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  to="#"
                                  className="text-sm font-medium text-foreground hover:text-primary leading-3.5 text-left"
                                >
                                  {order.product}
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{(order as any).tooltip || order.product.replace(/[….]/g, '')}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Link
                              to="#"
                              className="text-sm font-medium text-foreground hover:text-primary leading-3.5 text-left"
                            >
                              {order.product}
                            </Link>
                          )}

                          <span className="inline-flex items-center gap-0.5">
                            <span className="text-xs text-muted-foreground uppercase">
                              {t('SKU')}:
                            </span>{' '}
                            <span className="text-xs font-medium text-secondary-foreground">
                              {order.sku}
                            </span>
                          </span>
                        </div>
                      </div>
                      <Rating rating={order.rating} />
                    </div> 
                    <Separator className="my-3.5"/>

                    <p className="text-2sm text-foreground font-normal leading-5">
                      {order.text}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </TooltipProvider>
    </div>  
  );
}