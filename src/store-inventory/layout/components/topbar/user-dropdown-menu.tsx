import {
  CircleUser,
  Globe,
  Keyboard,
  LogOut,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth, ROLE_LABELS } from '@/auth';
import { I18N_LANGUAGES } from '@/i18n/config';
import type { Language } from '@/i18n/types';
import { useT } from '@/i18n/use-t';
import { toAbsoluteUrl } from '@/lib/helpers';
import { useLanguage } from '@/providers/i18n-provider';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarIndicator,
  AvatarStatus,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserDropdownMenu() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { currenLanguage, changeLanguage } = useLanguage();

  const handleLanguage = (lang: Language) => {
    changeLanguage(lang);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const displayName =
    user?.fullname ||
    `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() ||
    user?.email ||
    t('Guest');
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer">
        <Avatar className="size-7">
          <AvatarImage
            src={user?.pic || toAbsoluteUrl('/media/avatars/300-2.png')}
            alt={displayName}
          />
          <AvatarFallback>{initials}</AvatarFallback>
          <AvatarIndicator className="-end-2 -top-2">
            <AvatarStatus variant="online" className="size-2.5" />
          </AvatarIndicator>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64"
        side="bottom"
        align="end"
        sideOffset={11}
      >
        <div className="flex items-center gap-3 p-3">
          <Avatar>
            <AvatarImage
              src={user?.pic || toAbsoluteUrl('/media/avatars/300-2.png')}
              alt={displayName}
            />
            <AvatarFallback>{initials}</AvatarFallback>
            <AvatarIndicator className="-end-1.5 -top-1.5">
              <AvatarStatus variant="online" className="size-2.5" />
            </AvatarIndicator>
          </Avatar>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.email || t('Not signed in')}
            </span>
            {user?.role && (
              <Badge variant="secondary" appearance="light" className="w-fit">
                {t(ROLE_LABELS[user.role])}
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/store-inventory/users')}>
            <UserRound />
            <span>{t('User management')}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate('/store-inventory/settings-modal')}>
          <CircleUser />
          <span>{t('Settings')}</span>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2 [&_[data-slot=dropdown-menu-sub-trigger-indicator]]:hidden hover:[&_[data-slot=badge]]:border-input data-[state=open]:[&_[data-slot=badge]]:border-input">
            <Globe />
            <span className="flex items-center justify-between gap-2 grow relative">
              {t('Language')}
              <Badge
                variant="outline"
                className="absolute end-0 top-1/2 -translate-y-1/2"
              >
                {currenLanguage.label}
                <img
                  src={currenLanguage.flag}
                  className="w-3.5 h-3.5 rounded-full"
                  alt={currenLanguage.label}
                />
              </Badge>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuRadioGroup
              value={currenLanguage.code}
              onValueChange={(value) => {
                const selectedLang = I18N_LANGUAGES.find((lang) => lang.code === value);
                if (selectedLang) handleLanguage(selectedLang);
              }}
            >
              {I18N_LANGUAGES.map((item) => (
                <DropdownMenuRadioItem
                  key={item.code}
                  value={item.code}
                  className="flex items-center gap-2"
                >
                  <img
                    src={item.flag}
                    className="w-4 h-4 rounded-full"
                    alt={item.label}
                  />
                  <span>{item.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleTheme}>
          {theme === 'light' ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
          <span>
            {theme === 'light' ? t('Dark mode') : t('Light mode')}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Keyboard />
          <span>{t('Keyboard shortcuts')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void logout().then(() => navigate('/auth/signin'));
          }}
        >
          <LogOut />
          <span>{t('Log out')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
