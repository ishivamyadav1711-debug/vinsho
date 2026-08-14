import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;
const isReducedMotion = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
const isDesktop = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true;

export function initMotionEngine() {
  if (typeof window === 'undefined') {
    return { lenis: null, gsap, ScrollTrigger };
  }

  if (isReducedMotion) {
    document.body.classList.add('reduced-motion');
    ScrollTrigger.config({ autoRefreshEvents: 'none' });
    return { lenis: null, gsap, ScrollTrigger };
  }

  // Initialize Lenis smooth scroll
  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5
  });

  // Wire Lenis to ScrollTrigger update
  lenisInstance.on('scroll', () => {
    ScrollTrigger.update();
  });

  // Drive Lenis from GSAP ticker - Single unified RAF loop
  gsap.ticker.add((time) => {
    lenisInstance?.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  // Debounced ScrollTrigger refresh on window resize or orientation change
  let resizeTimeout: any = null;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 200);
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);

  // Refresh ScrollTrigger when web fonts are ready
  if (document.fonts) {
    document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
    });
  }

  return { lenis: lenisInstance, gsap, ScrollTrigger };
}

export function getLenis() {
  return lenisInstance;
}

export { gsap, ScrollTrigger, isReducedMotion, isDesktop };

