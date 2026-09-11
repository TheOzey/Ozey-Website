import { useEffect, useRef } from "react";

/**
 * Living Orbit — the hero identity layer.
 *
 * A small number of very large partial orbital curves and a restrained set
 * of circular nodes drifting along them, rotating imperceptibly around the
 * logo. The cursor exerts a gentle gravity (≤6px). One soft signal
 * originates from the slash direction, travels an orbit, and rests —
 * breathing, never looping.
 *
 * Performance contract:
 * - one canvas, requestAnimationFrame only while the hero is on screen
 *   and the document is visible (IntersectionObserver + visibilitychange)
 * - prefers-reduced-motion: a single static frame, no RAF, no gravity
 * - node/orbit density reduced on small viewports; gravity only for
 *   fine pointers
 */

const TAU = Math.PI * 2;
const SLASH_ANGLE = -Math.PI / 4; // ↗ the slash direction (bottom-left → top-right)

interface OrbitRing {
  r: number;
  dir: 1 | -1;
  alpha: number;
  arcs: Array<{ start: number; span: number }>;
}

interface OrbitNode {
  ring: number;
  angle: number;
  speed: number;
  size: number;
  tint: boolean;
}

export function HeroOrbit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const maybeCanvas = canvasRef.current;
    if (!maybeCanvas) return;
    const canvas = maybeCanvas;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx = maybeCtx;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    let w = 0;
    let h = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    let onScreen = true;
    let docHidden = false;
    let last = 0;
    let rot = 0;

    const cursor = { x: 0, y: 0, active: false };

    let rings: OrbitRing[] = [];
    let nodes: OrbitNode[] = [];

    // Signal breathing cycle: countdown → travel (1.2s) → fade (0.8s) → rest.
    let signalRing = 1;
    let signalT = -2.4; // first signal ~2.4s after the hero appears
    const TRAVEL = 1.2;
    const FADE = 0.8;
    const REST = 9;

    function setup() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2;
      cy = h / 2;

      const scale = Math.min(w, h);
      const small = w < 720;
      const radii = small ? [0.5, 0.78, 1.12] : [0.36, 0.54, 0.74, 1.02];

      rings = radii.map((f, i) => ({
        r: f * scale * 0.62,
        dir: (i % 2 === 0 ? 1 : -1) as 1 | -1,
        alpha: 0.11 - i * 0.02,
        arcs: [
          { start: (i * 1.9) % TAU, span: 2.0 - i * 0.22 },
          { start: (i * 1.9 + Math.PI * (0.92 + 0.11 * i)) % TAU, span: 1.15 },
        ],
      }));

      const count = small ? 6 : 11;
      nodes = Array.from({ length: count }, (_, i) => ({
        ring: i % rings.length,
        angle: (i * 2.399963) % TAU, // golden-angle spread
        speed: 0.018 + (i % 3) * 0.007,
        size: 1.3 + (i % 3) * 0.55,
        tint: i % 5 === 0,
      }));

      signalRing = Math.min(1, rings.length - 1);
    }

    function drawFadedArc(r: number, start: number, span: number, baseAlpha: number) {
      const SEG = 32;
      for (let s = 0; s < SEG; s++) {
        const t = (s + 0.5) / SEG;
        const fade = Math.sin(Math.PI * t); // soft ends — light, not wire
        ctx.beginPath();
        ctx.arc(cx, cy, r, start + (span * s) / SEG, start + (span * (s + 1)) / SEG);
        ctx.strokeStyle = `rgba(148,163,184,${(baseAlpha * fade).toFixed(4)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    function draw(dt: number) {
      ctx.clearRect(0, 0, w, h);
      rot += 0.008 * dt; // imperceptible base rotation

      for (const ring of rings) {
        const offset = rot * ring.dir;
        for (const arc of ring.arcs) {
          drawFadedArc(ring.r, arc.start + offset, arc.span, ring.alpha);
        }
      }

      for (const n of nodes) {
        const ring = rings[n.ring];
        n.angle += n.speed * ring.dir * dt;
        let x = cx + Math.cos(n.angle + rot * ring.dir) * ring.r;
        let y = cy + Math.sin(n.angle + rot * ring.dir) * ring.r;

        if (cursor.active) {
          const dx = cursor.x - x;
          const dy = cursor.y - y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.01) {
            const pull = Math.max(0, 1 - dist / 260) * 6; // ≤6px
            x += (dx / dist) * pull;
            y += (dy / dist) * pull;
          }
        }

        ctx.beginPath();
        ctx.arc(x, y, n.size, 0, TAU);
        ctx.fillStyle = n.tint ? "rgba(57,198,232,0.38)" : "rgba(148,163,184,0.3)";
        ctx.fill();
      }

      // Signal — breathes: appears, travels, fades, rests in silence.
      signalT += dt;
      if (signalT >= 0 && signalT <= TRAVEL + FADE) {
        const ring = rings[signalRing];
        const travel = Math.min(1, signalT / TRAVEL);
        const fade = signalT > TRAVEL ? 1 - (signalT - TRAVEL) / FADE : 1;
        const head = SLASH_ANGLE + travel * 1.7;
        const tailLen = 150 / ring.r; // ~150px of arc — locked signal length
        const SEG = 22;
        for (let s = 0; s < SEG; s++) {
          const t = s / SEG;
          const a1 = head - tailLen * (t + 1 / SEG);
          const a0 = head - tailLen * t;
          const alpha = (1 - t) * 0.5 * fade;
          const color = t < 0.45 ? "57,198,232" : "123,97,255";
          ctx.beginPath();
          ctx.arc(cx, cy, ring.r, a1, a0);
          ctx.strokeStyle = `rgba(${color},${alpha.toFixed(3)})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      } else if (signalT > TRAVEL + FADE + REST) {
        signalT = 0;
        signalRing = (signalRing + 1) % rings.length;
      }
    }

    function frame(now: number) {
      raf = 0;
      if (docHidden || !onScreen) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      draw(dt);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (reduced) return;
      if (!raf && onScreen && !docHidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    setup();
    if (reduced) {
      draw(0); // one calm static frame — no movement, nothing withheld
    } else {
      start();
    }

    const onResize = () => {
      setup();
      if (reduced) draw(0);
    };
    window.addEventListener("resize", onResize);

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    io.observe(canvas);

    const onVisibility = () => {
      docHidden = document.hidden;
      if (docHidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const host = canvas.parentElement?.parentElement; // the hero section
    let onMove: ((e: PointerEvent) => void) | undefined;
    let onLeave: (() => void) | undefined;
    if (finePointer && !reduced && host) {
      onMove = (e) => {
        const r = canvas.getBoundingClientRect();
        cursor.x = e.clientX - r.left;
        cursor.y = e.clientY - r.top;
        cursor.active = true;
      };
      onLeave = () => {
        cursor.active = false;
      };
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerleave", onLeave);
    }

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (host && onMove) host.removeEventListener("pointermove", onMove);
      if (host && onLeave) host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-orbit" aria-hidden />;
}
