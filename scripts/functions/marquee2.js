/**
 * marquee2.js — Seamless infinite marquee
 * Clones the content block so the strip scrolls without gaps.
 * Preserves the original #marqueeTrack / .marquee-content structure.
 */
(function () {
  'use strict';

  function initMarquee() {
    const track = document.getElementById('marqueeTrack');
    if (!track) return;

    const original = track.querySelector('.marquee-content');
    if (!original) return;

    // Clone enough times to fill screen + overflow
    const cloneCount = 4;
    for (let i = 0; i < cloneCount; i++) {
      const clone = original.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }

    // Pause on hover / focus for accessibility
    track.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
    track.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
    track.addEventListener('focusin',    () => track.style.animationPlayState = 'paused');
    track.addEventListener('focusout',   () => track.style.animationPlayState = 'running');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMarquee);
  } else {
    initMarquee();
  }
})();