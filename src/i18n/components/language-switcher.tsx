import { Globe } from 'lucide-react';
import { I18N_LANGUAGES } from '@/i18n/config';
import type { Language } from '@/i18n/types';
import { useT } from '@/i18n/use-t';
import { useLanguage } from '@/providers/i18n-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const { currenLanguage, changeLanguage } = useLanguage();

  const handleLanguage = (lang: Language) => {
    changeLanguage(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <Button variant="ghost" mode="icon" className="size-9">
            <Globe className="size-4" />
            <span className="sr-only">{t('Language')}</span>
          </Button>
        ) : (
          <Button variant="outline" className="gap-2">
            <Globe className="size-4" />
            <span>{t('Language')}</span>
            <Badge variant="outline" className="gap-1">
              {currenLanguage.label}
              <img
                src={currenLanguage.flag}
                className="h-3.5 w-3.5 rounded-full"
                alt={currenLanguage.label}
              />
            </Badge>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48" align="end">
        <DropdownMenuRadioGroup
          value={currenLanguage.code}
          onValueChange={(value) => {
            const selectedLang = I18N_LANGUAGES.find((lang) => lang.code === value);
            if (selectedLang) handleLanguage(selectedLang);
          }}
        >
          {I18N_LANGUAGES.map((item) => (
            <DropdownMenuRadioItem key={item.code} value={item.code} className="flex items-center gap-2">
              <img src={item.flag} className="h-4 w-4 rounded-full" alt={item.label} />
              <span>{item.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
