/* ==========================================================================
   hero.js - 3D perspective carousel exactly like tasteskill.dev
   7 images at 62% width, rounded 18px, depth -1000..+273px, scale 0.44..1.17
   perspective 3400px on stage, rotateX 3deg rotateY -4deg on field.
   Auto-rotates slowly, wraps, draggable (grab / grabbing).
   Matches live: hidden on <992px (mobile marquee takes over).
   ========================================================================== */

(function () {
  "use strict";

  var SPEED = 0.16; // positions per second - ~6.25s per step, 43s full loop (measured slow drift)
  var DRAG_SENSITIVITY = 0.006; // drag 300px ~ 1.8 positions
  var MAX_FRAME_MS = 64;

  // 7 positions measured from live site, nudged slightly wider so the fan
  // doesn't feel clipped, without bleeding far past the stage.
  var POSITIONS = [
    { x: 0, y: -315, z: -1000, rx: 4, ry: -3, scale: 0.44, opacity: 0, zIndex: 20 },
    { x: 0, y: -177.2, z: -140.54002214747334, rx: 2.657093784605427, ry: -1.8095238095238095, scale: 0.9368752996959919, opacity: 0.8028718646183719, zIndex: 74 },
    { x: 0, y: -39.4, z: 273.80055522858993, rx: 2.0096866324553284, ry: -0.6190476190476191, scale: 1.1764159459915284, opacity: 0.9970940102634015, zIndex: 100 },
    { x: 72.1, y: 69.1, z: 142.24919475978754, rx: 2.215235633187832, ry: 0.5714285714285712, scale: 1.100362815720502, opacity: 0.9354293100436504, zIndex: 91 },
    { x: 222.6, y: 73.5, z: -317.79697877167393, rx: 2.9340577793307405, ry: 1.7619047619047619, scale: 0.834398621647626, opacity: 0.7197826662007778, zIndex: 63 },
    { x: 373.5, y: 73.5, z: -972.3291418033899, rx: 3.9567642840677966, ry: 2.9523809523809526, scale: 0.45599721489491524, opacity: 0.040969316942426545, zIndex: 22 },
    { x: 0, y: -315, z: -1000, rx: 4, ry: -3, scale: 0.44, opacity: 0, zIndex: 20 }
  ];

  function prefersReducedMotion() {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function init() {
    var stage = document.querySelector("[data-hero-field]");
    if (!stage) return;
    var field = stage.querySelector(".hero__field");
    var nodes = field ? field.querySelectorAll(".hero__tile") : [];
    if (!field || !nodes.length) return;

    if (prefersReducedMotion() || typeof window.requestAnimationFrame !== "function") return;

    var tiles = Array.prototype.slice.call(nodes);

    var progress = 0; // 0..7, fractional
    var dragging = false;
    var dragStartX = 0;
    var dragStartProgress = 0;
    var lastTime = 0;
    var frame = 0;
    var visible = false;
    var pausedByDrag = false;

    function measure() {
      if (stage.offsetWidth === 0) return false;
      field.classList.add("is-live");
      return true;
    }

    function release() {
      field.classList.remove("is-live");
      tiles.forEach(function (el) {
        el.style.transform = "";
        el.style.opacity = "";
        el.style.zIndex = "";
        el.style.pointerEvents = "";
      });
    }

    function render() {
      if (!field.classList.contains("is-live")) return;
      tiles.forEach(function (el, i) {
        var pos = (i + progress) % POSITIONS.length;
        var idx0 = Math.floor(pos) % POSITIONS.length;
        var idx1 = (idx0 + 1) % POSITIONS.length;
        var t = pos - Math.floor(pos);
        var p0 = POSITIONS[idx0];
        var p1 = POSITIONS[idx1];
        var x = lerp(p0.x, p1.x, t);
        var y = lerp(p0.y, p1.y, t);
        var z = lerp(p0.z, p1.z, t);
        var rx = lerp(p0.rx, p1.rx, t);
        var ry = lerp(p0.ry, p1.ry, t);
        var scale = lerp(p0.scale, p1.scale, t);
        var opacity = lerp(p0.opacity, p1.opacity, t);
        var zIndex = Math.round(lerp(p0.zIndex, p1.zIndex, t));
        el.style.transform =
          "translate3d(calc(-50% + " + x + "px), calc(-50% + " + y + "px), " + z + "px) " +
          "rotateX(" + rx + "deg) rotateY(" + ry + "deg) rotateZ(0deg) scale(" + scale + ")";
        el.style.opacity = opacity;
        el.style.zIndex = zIndex;
        el.style.pointerEvents = opacity > 0.1 ? "auto" : "none";
      });
    }

    function tick(now) {
      if (!visible || dragging) return;
      var elapsed = Math.min(now - lastTime, MAX_FRAME_MS) / 1000;
      lastTime = now;
      progress = (progress + SPEED * elapsed) % POSITIONS.length;
      render();
      frame = window.requestAnimationFrame(tick);
    }

    function start() {
      if (visible) return;
      visible = true;
      lastTime = window.performance && window.performance.now ? window.performance.now() : Date.now();
      frame = window.requestAnimationFrame(tick);
    }

    function stop() {
      visible = false;
      window.cancelAnimationFrame(frame);
    }

    // drag: horizontal drag advances carousel progress
    function onPointerDown(e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      dragging = true;
      pausedByDrag = visible;
      stop();
      dragStartX = e.clientX;
      dragStartProgress = progress;
      stage.classList.add("is-dragging");
      if (typeof stage.setPointerCapture === "function") {
        try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }

    function onPointerMove(e) {
      if (!dragging) return;
      var delta = e.clientX - dragStartX;
      progress = (dragStartProgress - delta * DRAG_SENSITIVITY) % POSITIONS.length;
      if (progress < 0) progress += POSITIONS.length;
      render();
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      if (pausedByDrag) start();
    }

    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    stage.addEventListener("pointerleave", onPointerUp);

    window.addEventListener("resize", function () {
      if (!measure()) {
        release();
        stop();
        return;
      }
      render();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else if (!dragging) start();
    });

    if (!measure()) return;

    render();

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) start();
        else stop();
      }, { threshold: 0 });
      observer.observe(stage);
    } else {
      start();
    }
  }

  window.TasteSkill = window.TasteSkill || {};
  window.TasteSkill.hero = { init: init };
})();
