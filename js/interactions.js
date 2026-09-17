/* ==========================================================================
   interactions.js - tabs, copy to clipboard, avatar fallback, footer year
   Classic script. Exposes Portfolio.interactions.init().
   ========================================================================== */

(function () {
  "use strict";

  var COPY_RESET_MS = 2000;
  var CLIPBOARD_TIMEOUT_MS = 1200;

  /* ---------------------------------------------------------------------
     Tabs (install variants)
     Roving tabindex, Arrow / Home / End navigation, automatic activation.
     --------------------------------------------------------------------- */
  function initTabs() {
    var roots = document.querySelectorAll("[data-tabs]");

    Array.prototype.forEach.call(roots, function (root) {
      var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
      if (!tabs.length) {
        return;
      }

      function select(tab, focus) {
        tabs.forEach(function (item) {
          var selected = item === tab;
          var panel = document.getElementById(item.getAttribute("aria-controls"));

          item.setAttribute("aria-selected", selected ? "true" : "false");
          item.tabIndex = selected ? 0 : -1;

          if (panel) {
            panel.hidden = !selected;
          }
        });

        if (focus) {
          tab.focus();
        }
      }

      tabs.forEach(function (tab, index) {
        tab.addEventListener("click", function () {
          select(tab, false);
        });

        tab.addEventListener("keydown", function (event) {
          var next = null;

          if (event.key === "ArrowRight") {
            next = tabs[(index + 1) % tabs.length];
          } else if (event.key === "ArrowLeft") {
            next = tabs[(index - 1 + tabs.length) % tabs.length];
          } else if (event.key === "Home") {
            next = tabs[0];
          } else if (event.key === "End") {
            next = tabs[tabs.length - 1];
          }

          if (!next) {
            return;
          }

          event.preventDefault();
          select(next, true);
        });
      });

      select(tabs[0], false);
    });
  }

  /* ---------------------------------------------------------------------
     Copy to clipboard
     navigator.clipboard is unavailable in some file:// contexts, so a
     textarea + execCommand fallback is kept for real.
     --------------------------------------------------------------------- */

  /* Reads a code element while dropping anything the reader should not copy
     (decorative prompt glyphs are marked aria-hidden). */
  function readCopyValue(el) {
    var clone = el.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('[aria-hidden="true"]'), function (node) {
      node.parentNode.removeChild(node);
    });
    return clone.textContent.replace(/\s+/g, " ").trim();
  }

  function writeClipboardLegacy(value) {
    return new Promise(function (resolve, reject) {
      var field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.top = "-1000px";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();

      var copied = false;
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }

      document.body.removeChild(field);
      if (copied) {
        resolve();
      } else {
        reject(new Error("Copy failed"));
      }
    });
  }

  /* The async Clipboard API is unavailable outside a secure context and can sit
     unresolved when the permission prompt is suppressed (embedded views,
     headless, some file:// setups). The promise is therefore raced against a
     short timer and falls back to the legacy path, so the button always reports
     a result instead of silently doing nothing. */
  function writeClipboard(value) {
    if (!navigator.clipboard || !window.isSecureContext) {
      return writeClipboardLegacy(value);
    }

    return Promise.race([
      navigator.clipboard.writeText(value),
      new Promise(function (_, reject) {
        window.setTimeout(function () {
          reject(new Error("Clipboard timeout"));
        }, CLIPBOARD_TIMEOUT_MS);
      }),
    ]).catch(function () {
      return writeClipboardLegacy(value);
    });
  }

  function initCopyButtons() {
    var buttons = document.querySelectorAll("[data-copy]");

    Array.prototype.forEach.call(buttons, function (button) {
      var label = button.querySelector("[data-copy-label]");
      var defaultLabel = label ? label.textContent : "";
      var resetTimer = null;

      button.addEventListener("click", function () {
        var target = document.querySelector(button.getAttribute("data-copy"));
        if (!target) {
          return;
        }

        writeClipboard(readCopyValue(target))
          .then(function () {
            button.classList.add("is-copied");
            if (label) {
              label.textContent = "Copied";
            }
          })
          .catch(function () {
            button.classList.remove("is-copied");
            if (label) {
              label.textContent = "Press Ctrl+C";
            }
          })
          .then(function () {
            window.clearTimeout(resetTimer);
            resetTimer = window.setTimeout(function () {
              button.classList.remove("is-copied");
              if (label) {
                label.textContent = defaultLabel;
              }
            }, COPY_RESET_MS);
          });
      });
    });
  }

  /* ---------------------------------------------------------------------
     Avatar error state
     Public GitHub avatars are the only remote images in the wall; if one
     fails (offline, rate limit, renamed account) the tile degrades to the
     handle's initial instead of a broken image.
     --------------------------------------------------------------------- */
  function swapToInitial(image) {
    var link = image.closest("[data-avatar]");
    if (!link || !link.contains(image)) {
      return;
    }

    var handle = link.getAttribute("data-handle") || "";
    var fallback = document.createElement("span");
    fallback.className = "avatar__fallback";
    fallback.setAttribute("aria-hidden", "true");
    fallback.textContent = handle.charAt(0) || "?";

    link.replaceChild(fallback, image);
    link.setAttribute("aria-label", "GitHub profile of @" + handle);
  }

  function initAvatarFallback() {
    var images = document.querySelectorAll("[data-avatar] img");

    Array.prototype.forEach.call(images, function (image) {
      // A failed request may have completed before this script ran, in which
      // case no further error event is coming.
      if (image.complete && image.naturalWidth === 0) {
        swapToInitial(image);
        return;
      }

      image.addEventListener("error", function () {
        swapToInitial(image);
      });
    });
  }

  /* ---------------------------------------------------------------------
     Footer year - written once, so the markup never goes stale.
     --------------------------------------------------------------------- */
  function initFooterYear() {
    var target = document.querySelector("[data-year]");
    if (target) {
      target.textContent = String(new Date().getFullYear());
    }
  }

  function init() {
    initTabs();
    initCopyButtons();
    initAvatarFallback();
    initFooterYear();
  }

  window.Portfolio = window.Portfolio || {};
  window.Portfolio.interactions = { init: init };
})();
