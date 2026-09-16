/* ==========================================================================
   animations.js - scroll reveal
   One IntersectionObserver, one-shot, staggered inside grouped containers.
   Honours prefers-reduced-motion and degrades to "everything visible" when
   the API is missing. Exposes TasteSkill.animations.init().
   ========================================================================== */

(function () {
  "use strict";

  var STAGGER_MS = 60;
  var STAGGER_CAP_MS = 240;

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function revealAll() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-reveal]"), function (el) {
      el.classList.add("is-revealed");
    });
  }

  /* Groups get a cascading delay so a grid enters as a sequence rather than a
     single block. The cap keeps the last card from waiting too long. */
  function applyStagger() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-reveal-group]"), function (group) {
      var items = group.querySelectorAll("[data-reveal]");
      Array.prototype.forEach.call(items, function (item, index) {
        var delay = Math.min(index * STAGGER_MS, STAGGER_CAP_MS);
        item.style.setProperty("--reveal-delay", delay + "ms");
      });
    });
  }

  function revealVisible() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-reveal]:not(.is-revealed)"),
      function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add("is-revealed");
        }
      }
    );
  }

  function init() {
    if (!document.querySelector("[data-reveal]")) {
      return;
    }

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    applyStagger();

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );

    Array.prototype.forEach.call(document.querySelectorAll("[data-reveal]"), function (el) {
      observer.observe(el);
    });

    // Fragment links can land on a section before slow remote images finish.
    window.setTimeout(revealVisible, 150);

    // Images that finish loading late must not leave a section invisible.
    window.addEventListener("load", function () {
      window.setTimeout(revealVisible, 300);
    });
  }

  window.TasteSkill = window.TasteSkill || {};
  window.TasteSkill.animations = { init: init };
})();
