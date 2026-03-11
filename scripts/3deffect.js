
        class Slideshow3D {
            constructor() {
                this.images = document.querySelectorAll('.floating-image');
                this.dots = document.querySelectorAll('.nav-dot');
                this.currentIndex = 0;
                this.totalImages = this.images.length;
                this.autoPlayInterval = null;
                this.isAnimating = false;
                
                this.init();
            }

            init() {
                this.positionImages();
                this.setupEventListeners();
                this.startAutoPlay();
            }

            positionImages() {
                const container = document.getElementById('slideshow');
                const containerRect = container.getBoundingClientRect();
                const centerX = containerRect.width / 2;
                const centerY = containerRect.height / 2;

                this.images.forEach((img, index) => {
                    const offset = (index - this.currentIndex) % this.totalImages;
                    const normalizedOffset = offset < 0 ? offset + this.totalImages : offset;
                    
                    let xPos, yPos, scale, rotateY, rotateX, zIndex, opacity;

                    if (normalizedOffset === 0) {
                        // Active/Center image
                        xPos = centerX;
                        yPos = centerY;
                        scale = 1;
                        rotateY = 0;
                        rotateX = 0;
                        zIndex = 10;
                        opacity = 1;
                    } else if (normalizedOffset === 1 || normalizedOffset === -3) {
                        // Next image (right)
                        xPos = centerX + 200;
                        yPos = centerY - 50;
                        scale = 0.7;
                        rotateY = -25;
                        rotateX = 10;
                        zIndex = 5;
                        opacity = 0.4;
                    } else if (normalizedOffset === 2 || normalizedOffset === -2) {
                        // Far right
                        xPos = centerX + 350;
                        yPos = centerY - 100;
                        scale = 0.5;
                        rotateY = -45;
                        rotateX = 15;
                        zIndex = 3;
                        opacity = 0.2;
                    } else if (normalizedOffset === 3 || normalizedOffset === -1) {
                        // Previous image (left)
                        xPos = centerX - 200;
                        yPos = centerY - 50;
                        scale = 0.7;
                        rotateY = 25;
                        rotateX = 10;
                        zIndex = 5;
                        opacity = 0.4;
                    }

                    img.style.left = `${xPos - 190}px`;
                    img.style.top = `${yPos - 190}px`;
                    img.style.transform = `scale(${scale}) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
                    img.style.zIndex = zIndex;
                    img.style.opacity = normalizedOffset === 0 ? 1 : opacity;
                });
            }

            goToSlide(index) {
                if (this.isAnimating || index === this.currentIndex) return;
                
                this.isAnimating = true;
                this.currentIndex = index;

                // Update dots
                this.dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });

                // Reposition images with animation
                this.positionImages();

                setTimeout(() => {
                    this.isAnimating = false;
                }, 800);
            }

            nextSlide() {
                const nextIndex = (this.currentIndex + 1) % this.totalImages;
                this.goToSlide(nextIndex);
            }

            prevSlide() {
                const prevIndex = (this.currentIndex - 1 + this.totalImages) % this.totalImages;
                this.goToSlide(prevIndex);
            }

            setupEventListeners() {
                // Dot navigation
                this.dots.forEach((dot, index) => {
                    dot.addEventListener('click', () => {
                        this.goToSlide(index);
                        this.resetAutoPlay();
                    });
                });

                // Image click to go next
                this.images.forEach(img => {
                    img.addEventListener('click', () => {
                        this.nextSlide();
                        this.resetAutoPlay();
                    });
                });

                // Keyboard navigation
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowRight') {
                        this.nextSlide();
                        this.resetAutoPlay();
                    } else if (e.key === 'ArrowLeft') {
                        this.prevSlide();
                        this.resetAutoPlay();
                    }
                });

                // Pause on hover
                const container = document.getElementById('slideshow');
                container.addEventListener('mouseenter', () => {
                    this.stopAutoPlay();
                });

                container.addEventListener('mouseleave', () => {
                    this.startAutoPlay();
                });

                // Touch swipe support
                let touchStartX = 0;
                let touchEndX = 0;

                container.addEventListener('touchstart', (e) => {
                    touchStartX = e.changedTouches[0].screenX;
                }, { passive: true });

                container.addEventListener('touchend', (e) => {
                    touchEndX = e.changedTouches[0].screenX;
                    this.handleSwipe(touchStartX, touchEndX);
                }, { passive: true });
            }

            handleSwipe(startX, endX) {
                const swipeThreshold = 50;
                const diff = startX - endX;

                if (Math.abs(diff) > swipeThreshold) {
                    if (diff > 0) {
                        this.nextSlide();
                    } else {
                        this.prevSlide();
                    }
                    this.resetAutoPlay();
                }
            }

            startAutoPlay() {
                this.stopAutoPlay();
                this.autoPlayInterval = setInterval(() => {
                    this.nextSlide();
                }, 4000);
            }

            stopAutoPlay() {
                if (this.autoPlayInterval) {
                    clearInterval(this.autoPlayInterval);
                    this.autoPlayInterval = null;
                }
            }

            resetAutoPlay() {
                this.startAutoPlay();
            }
        }

        // Initialize slideshow when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            new Slideshow3D();
        });
   
        document.querySelectorAll(".product-card").forEach(card => {

    let currentX = 0;
    let currentY = 0;

    const strength = 0.08;

    card.addEventListener("mousemove", e => {

        const rect = card.getBoundingClientRect();

        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        card.style.setProperty("--glow-x", `${x * 100}%`);
        card.style.setProperty("--glow-y", `${y * 100}%`);

        const moveX = (x - 0.5) * 20;
        const moveY = (y - 0.5) * 20;

        currentX += (moveX - currentX) * strength;
        currentY += (moveY - currentY) * strength;

        card.style.transform =
            `translate(${currentX}px, ${currentY}px) rotateX(${moveY/2}deg) rotateY(${-moveX/2}deg)`;

    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "translate(0,0) rotateX(0deg) rotateY(0deg)";
    });

});

/* ═══════════════════════════════════════════════════
   products.js — Minimal MVP JavaScript
   Three responsibilities only:
   1. Nav scroll state
   2. IntersectionObserver scroll reveal (.reveal)
   3. Category filter state manager
═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── 1. NAV SCROLL ─────────────────────────────── */
  var nav = document.getElementById('main-nav');

  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* ─── 2. SCROLL REVEAL — IntersectionObserver ───── */
  var revealEls = Array.from(document.querySelectorAll('.reveal'));

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          /* Unobserve after reveal — memory safe, no reflow */
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -80px 0px',
      threshold: 0.08
    });

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    /* Fallback for browsers without IntersectionObserver */
    revealEls.forEach(function (el) {
      el.classList.add('active');
    });
  }

  /* ─── 3. CATEGORY FILTER STATE MANAGER ─────────── */
  var filterBtns = Array.from(document.querySelectorAll('.filter-btn'));
  var allCards   = Array.from(document.querySelectorAll('.pcard'));

  /* Cached category map — built once, never rebuilt */
  var categoryMap = {};
  allCards.forEach(function (card) {
    var cat = card.getAttribute('data-category') || 'all';
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(card);
  });

  /* Section map for smooth scroll anchor */
  var sectionMap = {
    cookies: document.getElementById('cookies'),
    churros: document.getElementById('sides'),
    bread:   document.getElementById('sides')
  };

  /* Active filter state */
  var activeCategory = 'all';

  function applyFilter(category) {
    if (category === activeCategory) return;
    activeCategory = category;

    /* Batch DOM reads before writes — anti-reflow */
    requestAnimationFrame(function () {
      allCards.forEach(function (card) {
        var cat = card.getAttribute('data-category');
        var show = category === 'all' || cat === category;

        if (show) {
          card.classList.remove('pcard--hidden');
          /* Re-trigger reveal for newly shown cards */
          card.classList.remove('active');
          requestAnimationFrame(function () {
            card.classList.add('active');
          });
        } else {
          card.classList.add('pcard--hidden');
        }
      });
    });

    /* Scroll to relevant section */
    if (category !== 'all' && sectionMap[category]) {
      var offset = 80; /* nav height */
      var top    = sectionMap[category].getBoundingClientRect().top
                   + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      /* Update active button state */
      filterBtns.forEach(function (b) {
        b.classList.remove('filter-btn--active');
      });
      btn.classList.add('filter-btn--active');

      applyFilter(btn.getAttribute('data-category'));
    });
  });

  /* ─── Filter bar sticky — add scrolled class to body ─ */
  var filterBarWrap = document.querySelector('.filter-bar-wrap');

  if (filterBarWrap) {
    var filterBarObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        filterBarWrap.classList.toggle('filter-bar-stuck', !entry.isIntersecting);
      });
    }, { rootMargin: '-1px 0px 0px 0px', threshold: 1 });

    filterBarObserver.observe(filterBarWrap);
  }

})();