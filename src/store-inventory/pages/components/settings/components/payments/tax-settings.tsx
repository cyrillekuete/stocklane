'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FilePlus, FileMinus, Globe, Globe2 } from "lucide-react";
import { RiMapPinLine } from "@remixicon/react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useT } from '@/i18n/use-t';
import { useSettingsForm } from "../../settings-form-context";
import { NumberField } from "../number-field";

export function TaxSettings() {
  const t = useT();
  const { draft, saved, updateDraft, fieldErrors } = useSettingsForm();
  const taxChanged =
    draft.taxPercent !== saved.taxPercent || draft.taxCalculation !== saved.taxCalculation;

  const taxOptions = [
    {
      id: 'inclusive',
      name: 'Inclusive',
      description: 'Tax is included in the displayed price',
      icon: <FilePlus className="size-5 text-foreground/70" />
    },
    {
      id: 'exclusive',
      name: 'Exclusive',
      description: 'Tax is added during checkout',
      icon: <FileMinus className="size-5 text-foreground/70" />
    }
  ];

  return (
    <Card className="bg-accent/70 rounded-md shadow-none h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Tax Settings')}</h3>
        <div className="bg-background rounded-md m-1 mt-0 border border-input py-6 px-3.5 space-y-5 h-full">
          <div className="flex items-start gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-2sm font-medium shrink-0">{t('Tax Rates')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('How tax rates are applied to orders')}</span>
            </div>
            <div className="basis-2/3">
              <Select value={draft.taxRateScope} onValueChange={(value) => updateDraft({ taxRateScope: value as typeof draft.taxRateScope })} indicatorPosition="right">
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('Apply per country')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="country">
                    <span className="flex items-center gap-2">
                      <Globe className="size-4 text-muted-foreground/60" />
                      <span>{t('Apply per country')}</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="state">
                    <span className="flex items-center gap-2">
                      <Globe2 className="size-4 text-muted-foreground/60" />
                      <span>{t('Apply per state')}</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="city">
                    <span className="flex items-center gap-2">
                      <RiMapPinLine className="size-4 text-muted-foreground/60" />
                      <span>{t('Apply per city')}</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-2sm font-medium shrink-0">{t('Tax Percent')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('Used at POS checkout')}</span>
            </div>
            <div className="basis-2/3">
              <NumberField
                id="settings-tax-percent"
                value={draft.taxPercent}
                min={0}
                max={100}
                step="0.01"
                ariaLabel={t('Tax Percent')}
                error={fieldErrors.taxPercent}
                onCommit={(taxPercent) => updateDraft({ taxPercent })}
              />
              {taxChanged ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('New POS sales will use this tax. Completed sales keep their original tax snapshot.')}
                </p>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-2sm font-medium shrink-0">{t('Tax Calculation')}</Label>
              <span className="text-xs font-normal text-muted-foreground">{t('Whether prices already include tax')}</span>
            </div>
            <div className="basis-2/3">
              <RadioGroup className="gap-1" value={draft.taxCalculation} onValueChange={(value) => updateDraft({ taxCalculation: value as typeof draft.taxCalculation })}>
                {taxOptions.map((option) => (
                  <Card
                    key={option.id}
                    role="radio"
                    tabIndex={0}
                    aria-checked={draft.taxCalculation === option.id}
                    className={`py-3 px-5 border-none shadow-none cursor-pointer ${
                      option.id === 'inclusive' ? 'rounded-b-none' : 'rounded-t-none'
                    } ${draft.taxCalculation === option.id ? 'bg-secondary' : 'bg-accent/50'}`}
                    onClick={() => updateDraft({ taxCalculation: option.id as typeof draft.taxCalculation })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        updateDraft({ taxCalculation: option.id as typeof draft.taxCalculation });
                      }
                    }}
                  >
                    <div className="flex items-center gap-5.5">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <div className="flex items-center gap-3.5">
                        <Card className="flex items-center justify-center rounded-md size-[36px] shadow-xs shrink-0">
                          <div className="flex items-center justify-center bg-accent/70 rounded-md size-[30px]">
                            {option.icon}
                          </div>
                        </Card>
                        <div>
                          <h3 className="font-medium text-2sm text-foreground">{t(option.name)}</h3>
                          <p className="text-xs text-muted-foreground font-normal">{t(option.description)}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </RadioGroup>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
