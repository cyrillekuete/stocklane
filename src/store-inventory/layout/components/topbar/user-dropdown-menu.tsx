import {
  Bell,
  CircleUser,
  Gift,
  Keyboard,
  LogOut,
  Moon,
  Smile,
  Sun,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
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
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserDropdownMenu() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer">
        <Avatar className="size-7">
          <AvatarImage
            src={toAbsoluteUrl('/media/avatars/300-2.png')}
            alt="@reui"
          />
          <AvatarFallback>CH</AvatarFallback>
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
              src={toAbsoluteUrl('/media/avatars/300-2.png')}
              alt="@reui"
            />
            <AvatarFallback>S</AvatarFallback>
            <AvatarIndicator className="-end-1.5 -top-1.5">
              <AvatarStatus variant="online" className="size-2.5" />
            </AvatarIndicator>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">Sean</span>
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>
        <DropdownMenuItem className="cursor-pointer py-1 rounded-md border border-border hover:bg-muted">
          <Smile />
          <span>Set status</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Bell />
            <span>Mute notifications</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-48">
              <DropdownMenuItem>For 30 minutes</DropdownMenuItem>
              <DropdownMenuItem>For 1 hour</DropdownMenuItem>
              <DropdownMenuItem>For 4 hours</DropdownMenuItem>
              <DropdownMenuItem>Until tomorrow</DropdownMenuItem>
              <DropdownMenuItem>Until next week</DropdownMenuItem>
              <DropdownMenuItem>Custom date and time</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem>
          <UserRound />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/store-inventory/settings-modal')}>
          <CircleUser />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/store-inventory/settings-modal?tab=notification')}>
          <Bell />
          <span>Notification settings</span>
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
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Keyboard />
          <span>Keyboard shortcuts</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Gift />
          <span>Referrals</span>
          <Badge variant="info" appearance="light" className="ms-auto">
            New
          </Badge>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
