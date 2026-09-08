import { initMotionEngine, gsap, ScrollTrigger, isReducedMotion, isDesktop } from './motion-engine';

let batchTriggers: ScrollTrigger[] = [];

export function setupCatalogueBatchGrid() {
  // Kill previous batch triggers on re-render to avoid memory leaks
  batchTriggers.forEach((st) => st.kill());
  batchTriggers = [];

  const grid = document.getElementById('grid');
  if (!grid || isReducedMotion) return;

  const visibleCards = Array.from(grid.querySelectorAll<HTMLElement>('.pc')).filter(
    (c) => c.style.display !== 'none'
  );

  const batches = ScrollTrigger.batch(visibleCards, {
    batchMax: 8,
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.06,
          ease: 'power3.out',
          overwrite: 'auto'
        }
      );
    },
    start: 'top 90%'
  });

  batchTriggers = batches;
}

document.addEventListener('DOMContentLoaded', () => {
  const { lenis } = initMotionEngine();

  // -------------------------------------------------------------
  // 1. Text Reveal Components (<TextReveal>)
  // -------------------------------------------------------------
  document.querySelectorAll<HTMLElement>('[data-text-reveal]').forEach((container) => {
    const lines = container.querySelectorAll<HTMLElement>('.tr-line-inner');
    const stagger = parseFloat(container.dataset.stagger || '0.08');
    const duration = parseFloat(container.dataset.duration || '0.8');
    const ease = container.dataset.ease || 'power3.out';
    const start = container.dataset.start || 'top 85%';

    if (isReducedMotion) {
      gsap.set(lines, { y: '0%' });
      return;
    }

    gsap.fromTo(
      lines,
      { y: '100%' },
      {
        y: '0%',
        duration,
        stagger,
        ease,
        scrollTrigger: {
          trigger: container,
          start,
          toggleActions: 'play none none none'
        }
      }
    );
  });

  // -------------------------------------------------------------
  // 2. Reveal Image Components (<RevealImage>)
  // -------------------------------------------------------------
  document.querySelectorAll<HTMLElement>('[data-reveal-image]').forEach((frame) => {
    const img = frame.querySelector<HTMLElement>('.reveal-img-target');
    const effects = (frame.dataset.effects || 'clip scale').split(' ');
    const duration = parseFloat(frame.dataset.duration || '1.0');
    const ease = frame.dataset.ease || 'power3.out';

    if (!img || isReducedMotion) return;

    const fromState: gsap.TweenVars = {};
    const toState: gsap.TweenVars = {
      duration,
      ease,
      scrollTrigger: {
        trigger: frame,
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    };

    effects.forEach((eff) => {
      if (eff === 'clip') {
        fromState.clipPath = 'inset(6% 6% 6% 6%)';
        toState.clipPath = 'inset(0% 0% 0% 0%)';
      }
      if (eff === 'scale') {
        fromState.scale = 1.08;
        toState.scale = 1.0;
      }
      if (eff === 'opacity') {
        fromState.opacity = 0;
        toState.opacity = 1;
      }
      if (eff === 'blur') {
        fromState.filter = 'blur(8px)';
        toState.filter = 'blur(0px)';
      }
    });

    gsap.fromTo(img, fromState, toState);
  });

  // -------------------------------------------------------------
  // 3. Parallax Image Components (<ParallaxImage>) - Responsive MatchMedia
  // -------------------------------------------------------------
  if (!isReducedMotion) {
    ScrollTrigger.matchMedia({
      "(min-width: 1024px)": function() {
        document.querySelectorAll<HTMLElement>('[data-parallax-container]').forEach((container) => {
          const img = container.querySelector<HTMLElement>('.parallax-img-target');
          const reverse = container.dataset.reverse === 'true';

          if (!img) return;

          const startY = reverse ? 8 : -8;
          const endY = reverse ? -8 : 8;

          gsap.fromTo(
            img,
            { yPercent: startY },
            {
              yPercent: endY,
              ease: 'none',
              scrollTrigger: {
                trigger: container,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1
              }
            }
          );
        });
      },
      "(max-width: 1023px)": function() {
        document.querySelectorAll<HTMLElement>('[data-parallax-container]').forEach((container) => {
          const img = container.querySelector<HTMLElement>('.parallax-img-target');
          if (!img) return;

          gsap.fromTo(
            img,
            { opacity: 0.85, y: 10 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: container,
                start: 'top 85%',
                toggleActions: 'play none none none'
              }
            }
          );
        });
      }
    });
  }

  // -------------------------------------------------------------
  // 4. Magnetic Buttons (<Magnetic>)
  // -------------------------------------------------------------
  if (isDesktop && !isReducedMotion) {
    document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((element) => {
      const strength = parseFloat(element.dataset.strength || '4');

      element.addEventListener('mousemove', (e) => {
        const rect = element.getBoundingClientRect();
        const relX = e.clientX - rect.left - rect.width / 2;
        const relY = e.clientY - rect.top - rect.height / 2;

        gsap.to(element, {
          x: (relX / rect.width) * (strength * 4),
          y: (relY / rect.height) * (strength * 4),
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      element.addEventListener('mouseleave', () => {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.4,
          ease: 'power2.out'
        });
      });
    });
  }

  // -------------------------------------------------------------
  // 5. Custom Cursor (Desktop Fine Pointer Only)
  // -------------------------------------------------------------
  const cursor = document.getElementById('custom-cursor');
  if (cursor && isDesktop && !isReducedMotion) {
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!cursor.classList.contains('active')) {
        cursor.classList.add('active');
      }
    });

    gsap.ticker.add(() => {
      cursorX += (mouseX - cursorX) * 0.2;
      cursorY += (mouseY - cursorY) * 0.2;
      gsap.set(cursor, { x: cursorX, y: cursorY });
    });

    // Hover targets
    document.querySelectorAll<HTMLElement>('a, button, [role="button"], .tab, .pc').forEach((target) => {
      target.addEventListener('mouseenter', () => {
        if (target.classList.contains('pc') || target.closest('.pc')) {
          cursor.classList.add('has-label');
        } else {
          cursor.classList.add('hover');
        }
      });

      target.addEventListener('mouseleave', () => {
        cursor.classList.remove('hover', 'has-label');
      });
    });
  }

  // -------------------------------------------------------------
  // Section 4.1: Nav Scroll Choreography
  // -------------------------------------------------------------
  const mainNav = document.querySelector<HTMLElement>('.main-navbar');
  if (mainNav && !isReducedMotion) {
    ScrollTrigger.create({
      start: 80,
      onUpdate: (self) => {
        const currentScroll = self.scroll;
        if (currentScroll > 80) {
          mainNav.classList.add('scrolled');
        } else {
          mainNav.classList.remove('scrolled');
        }
      }
    });
  }

  // -------------------------------------------------------------
  // Section 4.2: Hero Scale Settle + Staggered Reveal
  // -------------------------------------------------------------
  const heroImg = document.getElementById('hero-img-target');
  const heroLine1 = document.getElementById('hero-line-1');
  const heroLine2 = document.getElementById('hero-line-2');
  const heroBtn = document.getElementById('hero-cta-btn');
  const heroWordmark = document.getElementById('hero-wordmark');
  const heroSection = document.getElementById('hero-section');

  if (!isReducedMotion) {
    if (heroImg) {
      gsap.fromTo(
        heroImg,
        { scale: 1.08 },
        { scale: 1.0, duration: 1.6, ease: 'expo.out' }
      );
    }

    const tl = gsap.timeline({ delay: 0.1 });
    if (mainNav) {
      tl.fromTo(mainNav, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0);
    }
    if (heroLine1) {
      tl.fromTo(heroLine1, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.15);
    }
    if (heroLine2) {
      tl.fromTo(heroLine2, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.27);
    }
    if (heroBtn) {
      tl.fromTo(heroBtn, { opacity: 0, y: 25 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.48);
    }
    if (heroWordmark) {
      tl.fromTo(heroWordmark, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power3.out' }, 0.62);
    }

    if (heroSection) {
      gsap.to('#hero-content', {
        y: -40,
        opacity: 0,
        scrollTrigger: {
          trigger: heroSection,
          start: 'top top',
          end: 'bottom top',
          scrub: 1
        }
      });

      if (heroImg) {
        gsap.to(heroImg, {
          scale: 0.96,
          scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: 'bottom top',
            scrub: 1
          }
        });
      }
    }
  }

  // -------------------------------------------------------------
  // Section 4.4: Dream Décor Rail Staggered Card Reveal
  // -------------------------------------------------------------
  const railContainer = document.querySelector('[data-rail-stagger]');
  if (railContainer && !isReducedMotion) {
    const railCards = railContainer.querySelectorAll('.pc');
    gsap.fromTo(
      railCards,
      { opacity: 0, y: 30, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: railContainer,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  // -------------------------------------------------------------
  // Section 4.5: Most Loved Editorial Reveal (Clip Wipes)
  // -------------------------------------------------------------
  const lovedGrid = document.querySelector('[data-clip-grid]');
  if (lovedGrid && !isReducedMotion) {
    const lovedCards = lovedGrid.querySelectorAll('.pc');
    gsap.fromTo(
      lovedCards,
      { opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' },
      {
        opacity: 1,
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: lovedGrid,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  // -------------------------------------------------------------
  // Section 4.6: Catalogue Progressive Batch Grid Reveal
  // -------------------------------------------------------------
  setupCatalogueBatchGrid();
  (window as any).refreshCatalogueBatchGrid = setupCatalogueBatchGrid;

  // -------------------------------------------------------------
  // Section 4.8: Collections List Hover Image Reveal & Mobile Tap
  // -------------------------------------------------------------
  const collectionsContainer = document.querySelector('[data-collections-container]');
  const previewFrame = document.getElementById('collections-preview-frame');
  const previewImgs = document.querySelectorAll<HTMLElement>('.collections-preview-img');
  const collectionRows = document.querySelectorAll<HTMLElement>('[data-collection-row]');

  if (collectionsContainer && previewFrame && isDesktop && !isReducedMotion) {
    collectionRows.forEach((row) => {
      const key = row.dataset.collectionRow;

      row.addEventListener('mouseenter', () => {
        previewImgs.forEach((img) => {
          if (img.dataset.previewImg === key) {
            img.classList.add('active');
          } else {
            img.classList.remove('active');
          }
        });

        previewFrame.classList.add('visible');
      });
    });

    collectionsContainer.addEventListener('mouseleave', () => {
      previewFrame.classList.remove('visible');
    });
  }

  // -------------------------------------------------------------
  // Section 4.9: In Real Homes Mosaic Clip Wipe Reveal
  // -------------------------------------------------------------
  const mosaicGrid = document.querySelector('[data-mosaic-clip]');
  if (mosaicGrid && !isReducedMotion) {
    const tiles = mosaicGrid.querySelectorAll('.mt');
    gsap.fromTo(
      tiles,
      { clipPath: 'inset(10% 10% 10% 10%)', opacity: 0 },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        opacity: 1,
        duration: 0.9,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: mosaicGrid,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  // -------------------------------------------------------------
  // Section 4.10: Statement Cinematic Scale & Staggered Content
  // -------------------------------------------------------------
  const stmtSection = document.getElementById('statement-section');
  const stmtImg = document.getElementById('stmt-img-target');
  const stmtPara = document.getElementById('stmt-para');
  const stmtBtn = document.getElementById('stmt-cta-btn');

  if (stmtSection && !isReducedMotion) {
    if (stmtImg) {
      gsap.fromTo(
        stmtImg,
        { scale: 1.05 },
        {
          scale: 1.0,
          ease: 'none',
          scrollTrigger: {
            trigger: stmtSection,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1
          }
        }
      );
    }

    if (stmtPara) {
      gsap.fromTo(
        stmtPara,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: stmtSection,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        }
      );
    }

    if (stmtBtn) {
      gsap.fromTo(
        stmtBtn,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay: 0.32,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: stmtSection,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        }
      );
    }
  }

  // -------------------------------------------------------------
  // Section 4.11: Footer Upward Reveal & Wordmark Delay
  // -------------------------------------------------------------
  const footer = document.querySelector('[data-footer-reveal]');
  const footerWordmark = document.getElementById('footer-wordmark-frame');

  if (footer && !isReducedMotion) {
    gsap.fromTo(
      footer,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: footer,
          start: 'top 90%',
          toggleActions: 'play none none none'
        }
      }
    );

    if (footerWordmark) {
      gsap.fromTo(
        footerWordmark,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: footer,
            start: 'top 90%',
            toggleActions: 'play none none none'
          }
        }
      );
    }
  }

  // Refresh ScrollTrigger when web fonts finish loading to prevent layout shift offset bugs
  if ('fonts' in document) {
    document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
    });
  }
});
