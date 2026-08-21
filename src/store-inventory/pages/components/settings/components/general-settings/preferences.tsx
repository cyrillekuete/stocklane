'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useT } from '@/i18n/use-t';
import { useSettingsForm } from '../../settings-form-context';

const languages = [
  { code: "en-us", name: "English USA", flag: "🇺🇸" },
  { code: "en-gb", name: "English UK", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

const dateFormats = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

export function Preferences() {
  const t = useT();
  const { draft, updateDraft } = useSettingsForm();

  return (
    <Card className="bg-accent/70 rounded-md shadow-none h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        <h3 className="text-sm font-medium text-foreground py-2.5 ps-2">{t('Preferences')}</h3>
        <div className="bg-background rounded-md m-1 mt-0 border border-input p-5 space-y-5 h-full">
          <div className="flex items-start gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-sm font-medium tracking-[-0.13px] shrink-0">{t('Automatic time zone')}</Label>
              <span className="text-xs font-normal text-muted-foreground leading-none">{t('Adjusts time zone automatically')}</span>
            </div>
            <div className="basis-2/3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="automatic-timezone"
                  size="sm"
                  checked={draft.automaticTimeZone}
                  onCheckedChange={(checked) => updateDraft({ automaticTimeZone: checked })}
                />
                <Label htmlFor="automatic-timezone">{draft.timeZone}</Label>
              </div>
            </div>
          </div>
          <Separator />

          <div className="flex items-start gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-sm font-medium tracking-[-0.13px] shrink-0">{t('Language')}</Label>
              <span className="text-xs font-normal text-muted-foreground leading-none">{t('Default language for the store')}</span>
            </div>
            <div className="basis-2/3">
              <Select value={draft.language} onValueChange={(language) => updateDraft({ language })} indicatorPosition="right">
                <SelectTrigger>
                  <SelectValue placeholder={t('Select language')} />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span className="size-4">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-5">
            <div className="flex flex-col gap-0.5 basis-1/3">
              <Label className="text-sm font-medium tracking-[-0.13px] shrink-0">{t('Date format')}</Label>
              <span className="text-xs font-normal text-muted-foreground leading-none">{t('Format used for displaying dates')}</span>
            </div>
            <div className="basis-2/3">
              <Select value={draft.dateFormat} onValueChange={(dateFormat) => updateDraft({ dateFormat })} indicatorPosition="right">
                <SelectTrigger>
                  <SelectValue placeholder={t('Select date format')} />
                </SelectTrigger>
                <SelectContent>
                  {dateFormats.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
