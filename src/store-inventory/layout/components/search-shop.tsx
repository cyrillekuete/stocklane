import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';

function SearchField({
  inputRef,
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="relative">
      <Search className="size-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-2" />
      <Input
        ref={inputRef}
        type="text"
        className="px-7"
        placeholder="Search shop"
      />
      <Kbd
        className="absolute top-1/2 -translate-y-1/2 end-2 gap-1"
        variant="outline"
        size="sm"
      >
        ⌘ K
      </Kbd>
    </div>
  );
}

export function SearchShop() {
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            shape="circle"
            className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
          >
            <Search className="size-4.5!" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-4" align="center">
          <SearchField inputRef={inputRef} />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="relative lg:w-[280px]">
      <Search className="size-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-2" />
      <Input
        ref={inputRef}
        type="text"
        className="px-7"
        placeholder="Search shop"
      />
      <Kbd
        className="absolute top-1/2 -translate-y-1/2 end-2 gap-1"
        variant="outline"
        size="sm"
      >
        ⌘ K
      </Kbd>
    </div>
  );
}
