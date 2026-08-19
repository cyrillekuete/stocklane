import { RefObject, useEffect, useState } from 'react';

interface UseScrollPositionProps {
  targetRef?: RefObject<HTMLElement | Document | undefined>;
}

export function useScrollPosition({
  targetRef,
}: UseScrollPositionProps = {}): number {
  const [scrollPosition, setScrollPosition] = useState<number>(0);

  useEffect(() => {
    const target = targetRef?.current || document;
    const scrollable = target === document ? window : target;
    let frame = 0;

    const readScrollY = () =>
      target === document ? window.scrollY : (target as HTMLElement).scrollTop;

    const updatePosition = () => {
      frame = 0;
      const scrollY = readScrollY();
      setScrollPosition((prev) => {
        const wasSticky = prev > 0;
        const isSticky = scrollY > 0;
        if (wasSticky === isSticky) return prev;
        return scrollY;
      });
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(updatePosition);
    };

    scrollable.addEventListener('scroll', onScroll, { passive: true });
    updatePosition();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      scrollable.removeEventListener('scroll', onScroll);
    };
  }, [targetRef]);

  return scrollPosition;
}
