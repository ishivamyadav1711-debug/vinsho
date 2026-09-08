import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const isReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

export const isDesktop = typeof window !== 'undefined'
  ? window.matchMedia('(min-width: 1024px)').matches
  : true;

let lenisInstance: Lenis | null = null;

export function initMotionEngine() {
  if (typeof window === 'undefined') {
    return { lenis: null };
  }

  if (!lenisInstance && !isReducedMotion) {
    lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });

    lenisInstance.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenisInstance?.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  }

  return { lenis: lenisInstance };
}

export { gsap, ScrollTrigger };
