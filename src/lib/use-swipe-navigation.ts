import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  velocity?: number;
}

export function useSwipeNavigation(options: SwipeNavigationOptions = {}) {
  const router = useRouter();
  const elementRef = useRef<HTMLDivElement>(null);
  const hammerRef = useRef<{ destroy: () => void } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run on client side
    if (!isClient || typeof window === 'undefined') return;

    // Dynamically import Hammer.js only on client side
    import('hammerjs').then(() => {
      // Check if we're on mobile
      const checkMobile = () => {
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth <= 768;
        setIsMobile(isMobileDevice);
      };

      checkMobile();
      window.addEventListener('resize', checkMobile);

      return () => {
        window.removeEventListener('resize', checkMobile);
      };
    });
  }, [isClient]);

  useEffect(() => {
    // Only run on client side
    if (!isClient || typeof window === 'undefined') return;
    
    if (!isMobile || !elementRef.current) return;

    // Dynamically import Hammer.js only on client side
    import('hammerjs').then((HammerModule) => {
      const element = elementRef.current;
      if (!element) return;
      
      // Create Hammer instance
      const hammer = new HammerModule.default(element);
      hammerRef.current = hammer;

      // Configure swipe recognizer
      const swipe = hammer.get('swipe');
      swipe.set({
        direction: HammerModule.default.DIRECTION_HORIZONTAL,
        threshold: options.threshold || 50,
        velocity: options.velocity || 0.3,
      });

      // Handle swipe events
      hammer.on('swipeleft', () => {
        if (options.onSwipeLeft) {
          options.onSwipeLeft();
        } else {
          // Default navigation
          router.push('/history');
        }
      });

      hammer.on('swiperight', () => {
        if (options.onSwipeRight) {
          options.onSwipeRight();
        } else {
          // Default navigation
          router.push('/');
        }
      });

      // Cleanup
      return () => {
        if (hammerRef.current) {
          hammerRef.current.destroy();
          hammerRef.current = null;
        }
      };
    });
  }, [isClient, isMobile, router, options]);

  return {
    elementRef,
    isMobile,
  };
}
