// Optimized Animations System with Lazy Loading
// Only initializes features when they're needed or visible

(function() {
  'use strict';

  // Track which features have been initialized
  const initialized = {
    counters: false,
    magnetic: false,
    parallax: false,
    tilt: false,
    ripple: false,
    gradientMesh: false,
    particles: false,
    textReveal: false,
    smoothScroll: false
  };

  // ============================================
  // CORE FEATURES (Always Initialize)
  // ============================================

  // Scroll Progress Bar (lightweight, always visible)
  function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress';
    progressBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0%;
      height: 3px;
      background: linear-gradient(90deg, #6366f1, #ec4899, #0073aa);
      z-index: 9999;
      transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);

    let ticking = false;
    function updateProgress() {
      const scrolled = (document.documentElement.scrollTop /
        (document.documentElement.scrollHeight - document.documentElement.clientHeight)) * 100;
      progressBar.style.width = scrolled + '%';
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }, { passive: true });
  }

  // Page Loader (always needed on initial load)
  function initPageLoader() {
    const loader = document.getElementById('page-loader');
    if (loader) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          loader.style.opacity = '0';
          setTimeout(() => {
            loader.style.display = 'none';
          }, 500);
        }, 500);
      });
    }
  }

  // Smooth Scroll for Anchor Links (always needed)
  function initSmoothScroll() {
    if (initialized.smoothScroll) return;
    initialized.smoothScroll = true;

    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '#!') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ============================================
  // LAZY-LOADED FEATURES (On Demand)
  // ============================================

  // Counter Animations (only when visible)
  function initCounters() {
    if (initialized.counters) return;
    initialized.counters = true;

    const counters = document.querySelectorAll('[data-counter]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
          entry.target.dataset.counted = 'true';
          const target = parseInt(entry.target.dataset.counter);
          const suffix = entry.target.dataset.suffix || '';
          animateCounter(entry.target, target, 2000, suffix);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));

    function animateCounter(element, target, duration = 2000, suffix = '') {
      const increment = target / (duration / 16);
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        element.textContent = Math.floor(current) + suffix;
      }, 16);
    }
  }

  // Magnetic Effects (only for elements in viewport)
  function initMagnetic() {
    if (initialized.magnetic) return;
    initialized.magnetic = true;

    const elements = document.querySelectorAll('[data-magnetic]');
    if (elements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.magneticInit) {
          entry.target.dataset.magneticInit = 'true';
          attachMagneticEffect(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '50px' });

    elements.forEach(el => observer.observe(el));

    function attachMagneticEffect(element) {
      element.addEventListener('mousemove', (e) => {
        const rect = element.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
        const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
        element.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
      });

      element.addEventListener('mouseleave', () => {
        element.style.transform = 'translate(0, 0) scale(1)';
      });
    }
  }

  // Parallax Effects (only when scrolling near parallax elements)
  function initParallax() {
    if (initialized.parallax) return;
    initialized.parallax = true;

    const elements = document.querySelectorAll('[data-parallax]');
    if (elements.length === 0) return;

    let ticking = false;
    function updateParallax() {
      const scrollY = window.pageYOffset;
      elements.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.5;
        const offset = -(scrollY * speed);
        el.style.transform = `translateY(${offset}px)`;
      });
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });
  }

  // Tilt Effect (only for elements in viewport)
  function initTilt() {
    if (initialized.tilt) return;
    initialized.tilt = true;

    const elements = document.querySelectorAll('[data-tilt]');
    if (elements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.tiltInit) {
          entry.target.dataset.tiltInit = 'true';
          attachTiltEffect(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '50px' });

    elements.forEach(el => observer.observe(el));

    function attachTiltEffect(element) {
      element.style.transition = 'transform 0.3s ease';
      element.style.transformStyle = 'preserve-3d';

      element.addEventListener('mousemove', (e) => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const rotateY = ((y - rect.height / 2) / 10);
        const rotateX = ((centerX - x) / 10);
        element.style.transform = `perspective(1000px) rotateX(${rotateY}deg) rotateY(${rotateX}deg) scale3d(1.02, 1.02, 1.02)`;
      });

      element.addEventListener('mouseleave', () => {
        element.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      });
    }
  }

  // Ripple Effect (attach on demand)
  function initRipple() {
    if (initialized.ripple) return;
    initialized.ripple = true;

    document.querySelectorAll('[data-ripple]').forEach(element => {
      element.style.position = 'relative';
      element.style.overflow = 'hidden';

      element.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          top: ${y}px;
          left: ${x}px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          pointer-events: none;
          animation: ripple 0.6s ease-out;
        `;

        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  // Gradient Mesh (HEAVY - only when visible)
  function initGradientMesh() {
    if (initialized.gradientMesh) return;
    initialized.gradientMesh = true;

    const elements = document.querySelectorAll('[data-gradient-mesh]');
    if (elements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.meshInit) {
          entry.target.dataset.meshInit = 'true';
          createGradientMesh(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '100px' });

    elements.forEach(el => observer.observe(el));

    function createGradientMesh(element) {
      const colors = [
        'rgba(99, 102, 241, 0.3)',
        'rgba(236, 72, 153, 0.3)',
        'rgba(0, 115, 170, 0.3)',
        'rgba(245, 158, 11, 0.3)',
        'rgba(139, 92, 246, 0.3)'
      ];

      for (let i = 0; i < 5; i++) {
        const orb = document.createElement('div');
        orb.className = 'gradient-orb';
        const size = 300 + Math.random() * 300;

        orb.style.cssText = `
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.6;
          pointer-events: none;
          animation: float-slow ${8 + i * 2}s ease-in-out infinite;
          animation-delay: ${-i * 2}s;
          width: ${size}px;
          height: ${size}px;
          background: ${colors[i]};
          left: ${Math.random() * 100}%;
          top: ${Math.random() * 100}%;
        `;

        element.appendChild(orb);
      }
    }
  }

  // Particle System (HEAVY - only when visible)
  function initParticles() {
    if (initialized.particles) return;
    initialized.particles = true;

    const elements = document.querySelectorAll('[data-particles]');
    if (elements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.particlesInit) {
          entry.target.dataset.particlesInit = 'true';
          createParticles(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '100px' });

    elements.forEach(el => observer.observe(el));

    function createParticles(element) {
      const count = parseInt(element.dataset.particles) || 20;

      for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        particle.style.cssText = `
          position: absolute;
          width: 4px;
          height: 4px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.8), transparent);
          border-radius: 50%;
          pointer-events: none;
          animation: particle-float ${10 + Math.random() * 10}s linear infinite;
          animation-delay: ${-Math.random() * 20}s;
          left: ${Math.random() * 100}%;
          bottom: -10px;
        `;

        element.appendChild(particle);
      }
    }
  }

  // Text Reveal (only when visible)
  function initTextReveal() {
    if (initialized.textReveal) return;
    initialized.textReveal = true;

    const elements = document.querySelectorAll('[data-text-reveal]');
    if (elements.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.revealInit) {
          entry.target.dataset.revealInit = 'true';
          revealText(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '50px' });

    elements.forEach(el => observer.observe(el));

    function revealText(element) {
      const text = element.textContent;
      element.textContent = '';
      element.style.opacity = '1';

      text.split(' ').forEach((word, wordIndex) => {
        const wordSpan = document.createElement('span');
        wordSpan.style.display = 'inline-block';
        wordSpan.style.marginRight = '0.3em';

        word.split('').forEach((char, charIndex) => {
          const charSpan = document.createElement('span');
          charSpan.textContent = char;
          charSpan.style.display = 'inline-block';
          charSpan.style.opacity = '0';
          charSpan.style.animation = `fade-in 0.6s ease forwards ${wordIndex * 0.1 + charIndex * 0.03}s`;
          wordSpan.appendChild(charSpan);
        });

        element.appendChild(wordSpan);
      });
    }
  }

  // ============================================
  // SMART INITIALIZATION
  // ============================================

  function smartInit() {
    // Always initialize core features
    initScrollProgress();
    initPageLoader();
    initSmoothScroll();

    // Lazy initialize based on what elements exist in DOM
    if (document.querySelector('[data-counter]')) initCounters();
    if (document.querySelector('[data-magnetic]')) initMagnetic();
    if (document.querySelector('[data-parallax]')) initParallax();
    if (document.querySelector('[data-tilt]')) initTilt();
    if (document.querySelector('[data-ripple]')) initRipple();

    // Heavy features - only when elements are near viewport
    if (document.querySelector('[data-gradient-mesh]')) {
      setTimeout(initGradientMesh, 100);
    }
    if (document.querySelector('[data-particles]')) {
      setTimeout(initParticles, 100);
    }
    if (document.querySelector('[data-text-reveal]')) {
      setTimeout(initTextReveal, 100);
    }

    console.log('🎨 Optimized animations initialized');
  }

  // ============================================
  // ENTRY POINT
  // ============================================

  if (document.readyState !== 'loading') {
    smartInit();
  } else {
    document.addEventListener('DOMContentLoaded', smartInit);
  }

  // Expose reinit function for Astro page transitions
  window.reinitAnimations = smartInit;

})();
