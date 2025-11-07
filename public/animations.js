/**
 * World-Class Animation System
 * Premium interactions and effects
 */

(function() {
  'use strict';

  // ============================================
  // SCROLL REVEAL ANIMATIONS
  // ============================================
  function initScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');

          // Stagger children if they exist
          const children = entry.target.querySelectorAll('[data-stagger]');
          children.forEach((child, index) => {
            setTimeout(() => {
              child.classList.add('animate-in');
            }, index * 100);
          });
        }
      });
    }, observerOptions);

    // Observe all elements with data-animate attribute
    document.querySelectorAll('[data-animate]').forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
  }

  // ============================================
  // MAGNETIC CURSOR EFFECT
  // ============================================
  function initMagneticButtons() {
    const buttons = document.querySelectorAll('[data-magnetic]');

    buttons.forEach(button => {
      button.addEventListener('mousemove', (e) => {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const moveX = x * 0.3;
        const moveY = y * 0.3;

        button.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translate(0, 0) scale(1)';
      });
    });
  }

  // ============================================
  // NUMBER COUNTING ANIMATION
  // ============================================
  function animateCounter(element, target, duration = 2000, suffix = '') {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current) + suffix;
    }, 16);
  }

  function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    const observerOptions = {
      threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
          entry.target.dataset.counted = 'true';
          const target = parseInt(entry.target.dataset.counter);
          const suffix = entry.target.dataset.suffix || '';
          animateCounter(entry.target, target, 2000, suffix);
        }
      });
    }, observerOptions);

    counters.forEach(counter => observer.observe(counter));
  }

  // ============================================
  // SMOOTH SCROLL & PARALLAX
  // ============================================
  function initParallax() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');

    if (parallaxElements.length === 0) return;

    let ticking = false;

    function updateParallax() {
      const scrolled = window.pageYOffset;

      parallaxElements.forEach(element => {
        const speed = parseFloat(element.dataset.parallax) || 0.5;
        const yPos = -(scrolled * speed);
        element.style.transform = `translateY(${yPos}px)`;
      });

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    });
  }

  // ============================================
  // SCROLL PROGRESS INDICATOR
  // ============================================
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
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      progressBar.style.width = scrolled + '%';
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    });
  }

  // ============================================
  // 3D CARD TILT EFFECT
  // ============================================
  function init3DTilt() {
    const cards = document.querySelectorAll('[data-tilt]');

    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      });

      card.style.transition = 'transform 0.3s ease';
      card.style.transformStyle = 'preserve-3d';
    });
  }

  // ============================================
  // RIPPLE EFFECT ON CLICK
  // ============================================
  function initRippleEffect() {
    const rippleButtons = document.querySelectorAll('[data-ripple]');

    rippleButtons.forEach(button => {
      button.style.position = 'relative';
      button.style.overflow = 'hidden';

      button.addEventListener('click', function(e) {
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

  // ============================================
  // GRADIENT MESH BACKGROUND
  // ============================================
  function initGradientMesh() {
    const meshContainers = document.querySelectorAll('[data-gradient-mesh]');

    meshContainers.forEach(container => {
      // Create animated gradient orbs
      for (let i = 0; i < 5; i++) {
        const orb = document.createElement('div');
        orb.className = 'gradient-orb';
        orb.style.cssText = `
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.6;
          pointer-events: none;
          animation: float-slow ${8 + i * 2}s ease-in-out infinite;
          animation-delay: ${i * -2}s;
        `;

        const colors = [
          'rgba(99, 102, 241, 0.3)',
          'rgba(236, 72, 153, 0.3)',
          'rgba(0, 115, 170, 0.3)',
          'rgba(245, 158, 11, 0.3)',
          'rgba(139, 92, 246, 0.3)'
        ];

        const size = 300 + Math.random() * 300;
        orb.style.width = size + 'px';
        orb.style.height = size + 'px';
        orb.style.background = colors[i];
        orb.style.left = Math.random() * 100 + '%';
        orb.style.top = Math.random() * 100 + '%';

        container.appendChild(orb);
      }
    });
  }

  // ============================================
  // PARTICLE SYSTEM
  // ============================================
  function initParticles() {
    const particleContainers = document.querySelectorAll('[data-particles]');

    particleContainers.forEach(container => {
      const particleCount = parseInt(container.dataset.particles) || 20;

      for (let i = 0; i < particleCount; i++) {
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
          animation-delay: ${Math.random() * -20}s;
          left: ${Math.random() * 100}%;
          bottom: -10px;
        `;

        container.appendChild(particle);
      }
    });
  }

  // ============================================
  // LOADING SCREEN
  // ============================================
  function initLoadingScreen() {
    const loader = document.getElementById('page-loader');
    if (!loader) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
          loader.style.display = 'none';
        }, 500);
      }, 500);
    });
  }

  // ============================================
  // TEXT REVEAL ANIMATION
  // ============================================
  function initTextReveal() {
    const textElements = document.querySelectorAll('[data-text-reveal]');

    textElements.forEach(element => {
      const text = element.textContent;
      element.textContent = '';
      element.style.opacity = '1';

      const words = text.split(' ');
      words.forEach((word, wordIndex) => {
        const wordSpan = document.createElement('span');
        wordSpan.style.display = 'inline-block';
        wordSpan.style.marginRight = '0.3em';

        word.split('').forEach((char, charIndex) => {
          const span = document.createElement('span');
          span.textContent = char;
          span.style.display = 'inline-block';
          span.style.opacity = '0';
          span.style.animation = `fade-in 0.6s ease forwards ${(wordIndex * 0.1 + charIndex * 0.03)}s`;
          wordSpan.appendChild(span);
        });

        element.appendChild(wordSpan);
      });
    });
  }

  // ============================================
  // SMOOTH ANCHOR SCROLLING
  // ============================================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#' || href === '#!') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // ============================================
  // INITIALIZE ALL ANIMATIONS
  // ============================================
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Initialize all animation systems
    initLoadingScreen();
    initScrollAnimations();
    initMagneticButtons();
    initCounters();
    initParallax();
    initScrollProgress();
    init3DTilt();
    initRippleEffect();
    initGradientMesh();
    initParticles();
    initTextReveal();
    initSmoothScroll();

    console.log('🎨 World-class animations initialized');
  }

  // Auto-initialize
  init();

  // Re-initialize on page changes (for SPAs)
  window.reinitAnimations = init;

})();
