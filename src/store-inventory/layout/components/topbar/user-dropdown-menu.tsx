import {
  CircleUser,
  Keyboard,
  LogOut,
  Moon,
  Sun,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth, ROLE_LABELS } from '@/auth';
import { toAbsoluteUrl } from '@/lib/helpers';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserDropdownMenu() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const displayName =
    user?.fullname ||
    `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() ||
    user?.email ||
    'Guest';
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
              {user?.email || 'Not signed in'}
            </span>
            {user?.role && (
              <Badge variant="secondary" appearance="light" className="w-fit">
                {ROLE_LABELS[user.role]}
              </Badge>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate('/store-inventory/users')}>
            <UserRound />
            <span>User management</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate('/store-inventory/settings-modal')}>
          <CircleUser />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleTheme}>
          {theme === 'light' ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Keyboard />
          <span>Keyboard shortcuts</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void logout().then(() => navigate('/auth/signin'));
          }}
        >
          <LogOut />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
