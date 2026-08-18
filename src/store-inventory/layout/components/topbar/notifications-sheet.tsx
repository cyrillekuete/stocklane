import { ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarIndicator,
  AvatarStatus,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const notifications = [
  {
    avatar: '/media/avatars/300-1.png',
    name: 'Nova Hawthorne',
    action: 'sent you a message',
    time: '2 mins ago',
    online: true,
  },
  {
    avatar: '/media/avatars/300-5.png',
    name: 'Adrian Cross',
    action: 'commented on your order',
    time: '1 hour ago',
    online: false,
  },
  {
    avatar: '/media/avatars/300-4.png',
    name: 'Skylar Frost',
    action: 'has invited you to join',
    time: '4 days ago',
    online: true,
  },
];

export function NotificationsSheet({ trigger }: { trigger: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="p-0 gap-0 sm:w-[440px] sm:max-w-none inset-5 start-auto h-auto rounded-lg [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="mb-0">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <SheetTitle>Notifications</SheetTitle>
            <Button variant="ghost" mode="icon" size="sm">
              <Settings className="size-4!" />
            </Button>
          </div>
        </SheetHeader>
        <SheetBody className="scrollable-y-auto grow p-0">
          <div className="divide-y divide-border">
            {notifications.map((item) => (
              <div
                key={item.name}
                className="flex items-start gap-3 px-5 py-4 hover:bg-muted/40"
              >
                <Avatar className="size-9">
                  <AvatarImage src={toAbsoluteUrl(item.avatar)} alt={item.name} />
                  <AvatarFallback>{item.name.slice(0, 1)}</AvatarFallback>
                  <AvatarIndicator className="-end-1.5 -bottom-1.5">
                    <AvatarStatus
                      variant={item.online ? 'online' : 'offline'}
                      className="size-2.5"
                    />
                  </AvatarIndicator>
                </Avatar>
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm">
                    <span className="font-semibold text-foreground">
                      {item.name}
                    </span>{' '}
                    <span className="text-muted-foreground">{item.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SheetBody>
        <SheetFooter className="border-t border-border p-5 grid grid-cols-2 gap-2.5">
          <Button variant="outline">Archive all</Button>
          <Button variant="outline">Mark all as read</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
