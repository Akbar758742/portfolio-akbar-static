/* ==========================================================================
   navigation.js - header state, mobile panel, nav dropdown, active section
   Classic script (no modules) so the page works when opened from the
   filesystem without a server. Exposes Portfolio.navigation.init().
   ========================================================================== */

(function () {
  "use strict";

  var MEDIA_DESKTOP = "(min-width: 992px)";
  var MOBILE_BREAKPOINT = 992;

  /* ---------------------------------------------------------------------
     Header state
     A 1px sentinel sits in normal flow directly above the sticky header, so
     it leaves the viewport at the exact moment the header pins. No scroll
     listener, no magic pixel values.
     --------------------------------------------------------------------- */
  function initHeaderState() {
    var header = document.querySelector("[data-header]");
    var sentinel = document.querySelector("[data-header-sentinel]");
    if (!header || !sentinel) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      header.classList.add("is-stuck");
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      header.classList.toggle("is-stuck", !entries[0].isIntersecting);
    });
    observer.observe(sentinel);
  }

  /* ---------------------------------------------------------------------
     Nav dropdown
     --------------------------------------------------------------------- */
  function initDropdown(closeOnOutside) {
    var menu = document.querySelector("[data-dropdown]");
    if (!menu) {
      return { close: function () {} };
    }

    var trigger = menu.querySelector("[data-dropdown-trigger]");
    var panel = trigger ? document.getElementById(trigger.getAttribute("aria-controls")) : null;
    if (!trigger || !panel) {
      return { close: function () {} };
    }

    function setOpen(open) {
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      menu.classList.toggle("is-open", open);
    }

    function close() {
      if (trigger.getAttribute("aria-expanded") === "true") {
        setOpen(false);
      }
    }

    setOpen(false);

    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      setOpen(trigger.getAttribute("aria-expanded") !== "true");
    });

    trigger.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
        var first = panel.querySelector("a");
        if (first) {
          first.focus();
        }
      }
    });

    panel.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowUp") {
        return;
      }
      var items = Array.prototype.slice.call(panel.querySelectorAll("a"));
      if (items.indexOf(document.activeElement) === 0) {
        event.preventDefault();
        trigger.focus();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") {
        return;
      }
      if (trigger.getAttribute("aria-expanded") === "true") {
        close();
        trigger.focus();
      }
    });

    closeOnOutside(function (event) {
      if (!menu.contains(event.target)) {
        close();
      }
    });

    return { close: close };
  }

  /* ---------------------------------------------------------------------
     Mobile panel
     --------------------------------------------------------------------- */
  function initMobileNav(onOpenChange) {
    var toggle = document.querySelector("[data-nav-toggle]");
    var panel = document.getElementById("nav-panel");
    if (!toggle || !panel) {
      return { close: function () {} };
    }

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      panel.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-locked", open);
      if (onOpenChange) {
        onOpenChange(open);
      }
    }

    function close() {
      if (toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        return true;
      }
      return false;
    }

    setOpen(false);

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    panel.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        close();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && close()) {
        toggle.focus();
      }
    });

    // Returning to the desktop layout must not leave the page scroll-locked.
    if (window.matchMedia) {
      var desktop = window.matchMedia(MEDIA_DESKTOP);
      var onChange = function (event) {
        if (event.matches) {
          close();
        }
      };
      if (typeof desktop.addEventListener === "function") {
        desktop.addEventListener("change", onChange);
      } else if (typeof desktop.addListener === "function") {
        desktop.addListener(onChange);
      }
      window.addEventListener("resize", function () {
        if (window.innerWidth >= MOBILE_BREAKPOINT) {
          close();
        }
      });
    }

    return { close: close };
  }

  /* ---------------------------------------------------------------------
     Active section marking for the primary nav links
     --------------------------------------------------------------------- */
  function initSectionSpy() {
    var sections = document.querySelectorAll("[data-nav-spy]");
    var links = document.querySelectorAll("[data-nav-link]");
    if (!sections.length || !links.length || !("IntersectionObserver" in window)) {
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          var id = "#" + entry.target.id;
          Array.prototype.forEach.call(links, function (link) {
            var isCurrent = link.getAttribute("href") === id;
            link.setAttribute("aria-current", isCurrent ? "true" : "false");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    Array.prototype.forEach.call(sections, function (section) {
      observer.observe(section);
    });
  }

  function init() {
    var closeDropdown = function () {};

    initHeaderState();

    initMobileNav(function (open) {
      if (!open) {
        closeDropdown();
      }
    });

    closeDropdown = initDropdown(function (onOutsideClick) {
      document.addEventListener("click", onOutsideClick);
    }).close || closeDropdown;

    initSectionSpy();
  }

  window.Portfolio = window.Portfolio || {};
  window.Portfolio.navigation = { init: init };
})();
