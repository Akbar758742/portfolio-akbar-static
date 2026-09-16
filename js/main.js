/* ==========================================================================
   main.js - bootstrap the modules
   Each module is independent and can be dropped from the page without
   breaking the others. Load order in index.html: navigation, animations,
   hero, interactions, main.
   ========================================================================== */

(function () {
  "use strict";

  var MODULES = ["navigation", "animations", "hero", "interactions"];

  function init() {
    var app = window.TasteSkill || {};

    MODULES.forEach(function (name) {
      var module = app[name];
      if (module && typeof module.init === "function") {
        module.init();
      }
    });
  }

  window.TasteSkill = window.TasteSkill || {};
  window.TasteSkill.init = init;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
