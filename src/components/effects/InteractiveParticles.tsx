"use client";

/**
 * Ambient particle layer + interactive sparkle trail for the "Đổi Bối Cảnh &
 * Chủ Đề" system.
 *
 * One full-bleed <canvas> (pointer-events disabled, so it never blocks taps)
 * that renders the active theme's ambient particles —
 *   · hearts  : gently rising pink hearts + sparkles
 *   · rain     : diagonal translucent raindrop streaks
 *   · petals   : blossom petals falling with a horizontal sway
 *   · stars    : twinkling star field + periodic shooting stars
 * — plus a micro-burst of sparkles that follow the pointer / finger and fade
 * over 0.6s.
 *
 * Performance contract (target 60fps on mid-range phones):
 *   · The rAF loop is set up ONCE and never restarts on a theme change — the
 *     new theme is read from refs so switching is just a reseed, not a
 *     teardown.
 *   · Particle counts scale with width and are capped; DPR is capped at 2.
 *   · The loop and listeners pause while the tab is hidden.
 *   · `prefers-reduced-motion` renders a static, still frame (no rAF loop).
 */
import { useEffect, useRef } from "react";

export type ParticleKind = "hearts" | "rain" | "petals" | "stars";

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  /** Phase / timer for twinkle, sway, or shooting-star cadence. */
  phase: number;
  kind: "dot" | "heart" | "sparkle" | "petal" | "shooter";
  /** Shooting stars only: elapsed life in frames. */
  life?: number;
  maxLife?: number;
}

interface TrailSparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  born: number;
  life: number;
}

interface Props {
  kind: ParticleKind;
  /** Theme accent — the sparkle / star / trail tint. */
  accent: string;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export default function InteractiveParticles({ kind, accent }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mutable theme state the persistent rAF loop reads every frame.
  const kindRef = useRef<ParticleKind>(kind);
  const accentRef = useRef<string>(accent);
  // Seed-once flag so the ambient pool resets exactly when the theme changes.
  const seededForRef = useRef<ParticleKind | null>(null);

  // Re-sync the refs on every render; a theme change then just reseeds inside
  // the already-running loop (no teardown, no flash).
  useEffect(() => {
    kindRef.current = kind;
    accentRef.current = accent;
  }, [kind, accent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia(REDUCED_MOTION_QUERY).matches;

    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    let ambient: AmbientParticle[] = [];
    let trail: TrailSparkle[] = [];
    let shootingIn = 60; // frames until the next shooting star
    let rect: DOMRect = canvas.getBoundingClientRect();
    let rafId = 0;
    let last = 0;

    /** Rebuild the canvas backing store to match its laid-out size. */
    function sizeCanvas() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cssW = parent.clientWidth;
      cssH = parent.clientHeight;
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      rect = canvas.getBoundingClientRect();
    }

    /** The active ambient particle count — scales with width, capped. */
    function ambientCount() {
      const w = cssW || 360;
      const target = kindRef.current === "rain" ? w / 14 : w / 22;
      return Math.round(Math.min(70, Math.max(24, target)));
    }

    /** Seed (or reseed) the ambient pool for the current theme. */
    function reseed() {
      if (seededForRef.current === kindRef.current) return;
      seededForRef.current = kindRef.current;
      const n = ambientCount();
      ambient = Array.from({ length: n }, () => makeAmbient(true));
      trail = [];
      shootingIn = 90;
    }

    function makeAmbient(warm: boolean): AmbientParticle {
      const kind = kindRef.current;
      const x = Math.random() * cssW;
      if (kind === "rain") {
        return {
          x,
          y: Math.random() * cssH,
          vx: -1.6,
          vy: 6 + Math.random() * 4,
          size: 8 + Math.random() * 12,
          alpha: 0.15 + Math.random() * 0.2,
          phase: 0,
          kind: "dot",
        };
      }
      if (kind === "stars") {
        // Static twinkling field; a few will become shooting stars on a timer.
        return {
          x,
          y: Math.random() * (cssH * 0.7),
          vx: 0,
          vy: 0,
          size: 0.6 + Math.random() * 1.6,
          alpha: 0.3 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          kind: "dot",
        };
      }
      // hearts / petals: scatter vertically. Hearts drift up, petals drift down.
      const y = warm
        ? Math.random() * cssH
        : kind === "hearts"
        ? cssH + 10
        : -10;
      if (kind === "hearts") {
        return {
          x,
          y,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(0.3 + Math.random() * 0.5),
          size: 6 + Math.random() * 8,
          alpha: 0.5 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          kind: Math.random() < 0.7 ? "heart" : "sparkle",
        };
      }
      return {
        x,
        y,
        vx: 0,
        vy: 0.4 + Math.random() * 0.5,
        size: 5 + Math.random() * 7,
        alpha: 0.45 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        kind: "petal",
      };
    }

    function spawnTrail(x: number, y: number) {
      const now = performance.now();
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 0.3 + Math.random() * 1.2;
        trail.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 0.3,
          size: 4 + Math.random() * 5,
          born: now,
          life: 600,
        });
      }
      // Hard cap the trail pool so a frantic swipe can't balloon the array.
      if (trail.length > 90) trail.splice(0, trail.length - 90);
    }

    function onPointerMove(e: PointerEvent) {
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      if (lx < 0 || ly < 0 || lx > cssW || ly > cssH) return;
      spawnTrail(lx, ly);
      if (reducedMotion) drawStatic();
    }

    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      spawnTrail(t.clientX - rect.left, t.clientY - rect.top);
    }

    // ── Drawing ──────────────────────────────────────────────────────

    function drawHeart(p: AmbientParticle) {
      const s = p.size;
      ctx!.save();
      ctx!.globalAlpha = p.alpha;
      ctx!.fillStyle = "#f472b6";
      ctx!.beginPath();
      ctx!.arc(p.x - s * 0.3, p.y - s * 0.12, s * 0.32, 0, Math.PI * 2);
      ctx!.arc(p.x + s * 0.3, p.y - s * 0.12, s * 0.32, 0, Math.PI * 2);
      ctx!.moveTo(p.x - s * 0.6, p.y);
      ctx!.lineTo(p.x + s * 0.6, p.y);
      ctx!.lineTo(p.x, p.y + s * 0.8);
      ctx!.closePath();
      ctx!.fill();
      ctx!.restore();
    }

    function drawSparkle(
      x: number,
      y: number,
      s: number,
      color: string,
      alpha: number
    ) {
      ctx!.save();
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.moveTo(x, y - s);
      ctx!.quadraticCurveTo(x, y, x + s, y);
      ctx!.quadraticCurveTo(x, y, x, y + s);
      ctx!.quadraticCurveTo(x, y, x - s, y);
      ctx!.quadraticCurveTo(x, y, x, y - s);
      ctx!.fill();
      ctx!.restore();
    }

    function drawPetal(p: AmbientParticle, sway: number) {
      ctx!.save();
      ctx!.globalAlpha = p.alpha;
      ctx!.translate(p.x + sway, p.y);
      ctx!.rotate(p.phase + sway * 0.02);
      ctx!.fillStyle = "#f9a8d4";
      ctx!.beginPath();
      ctx!.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
    }

    function drawAmbient(t: number) {
      const k = kindRef.current;
      const acc = accentRef.current;
      for (const p of ambient) {
        if (k === "rain") {
          ctx!.save();
          ctx!.globalAlpha = p.alpha;
          ctx!.strokeStyle = "#93c5fd";
          ctx!.lineWidth = 1.2;
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(p.x - p.size * 0.28, p.y + p.size);
          ctx!.stroke();
          ctx!.restore();
        } else if (k === "stars") {
          // Twinkle: alpha oscillates with the particle's own phase.
          const tw = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.002 + p.phase));
          drawSparkle(p.x, p.y, p.size + 1, acc, tw * p.alpha);
        } else if (k === "hearts") {
          p.kind === "heart"
            ? drawHeart(p)
            : drawSparkle(p.x, p.y, p.size, acc, p.alpha);
        } else {
          // petals
          drawPetal(p, Math.sin(t * 0.001 + p.phase) * 10);
        }
      }
    }

    function drawShooter() {
      // Only the star theme has shooting stars.
      if (kindRef.current !== "stars") return;
      const p = ambient.find((a) => a.kind === "shooter");
      if (p) {
        const headX = p.x;
        const headY = p.y;
        const grad = ctx!.createLinearGradient(
          headX,
          headY,
          headX - p.size,
          headY - p.size * 0.6
        );
        grad.addColorStop(0, accentRef.current);
        grad.addColorStop(1, "transparent");
        ctx!.save();
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.moveTo(headX, headY);
        ctx!.lineTo(headX - p.size, headY - p.size * 0.6);
        ctx!.stroke();
        ctx!.globalAlpha = 0.9;
        ctx!.fillStyle = "#fff";
        ctx!.beginPath();
        ctx!.arc(headX, headY, 1.6, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }
    }

    function drawTrail() {
      const now = performance.now();
      const acc = accentRef.current;
      for (const s of trail) {
        const age = now - s.born;
        if (age > s.life) continue;
        const f = 1 - age / s.life; // 1 → 0 over the fade window
        drawSparkle(s.x, s.y, s.size * f + 1, acc, f * 0.9);
      }
    }

    /** One still frame — used for reduced-motion and as the initial paint. */
    function drawStatic() {
      ctx!.clearRect(0, 0, cssW, cssH);
      reseed();
      drawAmbient(16); // a fixed phase, so the field is visible but calm
      drawTrail();
    }

    // ── Motion update ────────────────────────────────────────────────

    function step(f: number, t: number) {
      ctx!.clearRect(0, 0, cssW, cssH);
      const k = kindRef.current;

      for (const p of ambient) {
        if (k === "stars") {
          // Slow twinkle — positions are static; only occasional shooters move.
          if (p.kind === "shooter") {
            p.life = (p.life ?? 0) + f;
            p.x += p.vx * f;
            p.y += p.vy * f;
            if (p.life > p.maxLife!) ambient = ambient.filter((a) => a !== p);
          }
          continue;
        }
        if (k === "hearts") {
          p.y += p.vy * f;
          p.x += (p.vx + Math.sin(t * 0.001 + p.phase) * 0.2) * f;
          if (p.y < -p.size) {
            p.y = cssH + p.size;
            p.x = Math.random() * cssW;
          }
        } else if (k === "petals") {
          p.y += p.vy * f;
          if (p.y > cssH + p.size) {
            p.y = -p.size;
            p.x = Math.random() * cssW;
          }
        } else {
          // rain
          p.x += p.vx * f;
          p.y += p.vy * f;
          if (p.y > cssH + p.size) {
            p.y = -p.size;
            p.x = Math.random() * cssW;
          }
          if (p.x < -p.size) p.x = cssW;
        }
      }

      // Shooting stars: every `shootingIn` frames, launch one across the top.
      if (k === "stars") {
        shootingIn -= f;
        if (shootingIn <= 0) {
          shootingIn = 180 + Math.random() * 240;
          ambient.push({
            x: Math.random() * cssW * 0.5,
            y: Math.random() * cssH * 0.2,
            vx: 7 + Math.random() * 5,
            vy: 2 + Math.random() * 2,
            size: 60 + Math.random() * 50,
            alpha: 1,
            phase: 0,
            kind: "shooter",
            life: 0,
            maxLife: 90,
          });
        }
      }

      // Advance the trail sparkles.
      trail = trail.filter((s) => performance.now() - s.born <= s.life);
      for (const s of trail) {
        s.x += s.vx * f;
        s.y += s.vy * f;
        s.vy += 0.02 * f; // gentle gravity
      }

      drawAmbient(t);
      drawShooter();
      drawTrail();
    }

    function loop(ts: number) {
      rafId = requestAnimationFrame(loop);
      if (document.hidden) {
        last = ts;
        return;
      }
      const dtMs = last ? ts - last : 16.7;
      last = ts;
      const f = Math.max(0, Math.min(3, dtMs / 16.7)); // frame-rate normalizer
      step(f, ts);
    }

    // ── Wire-up ──────────────────────────────────────────────────────

    function onResize() {
      sizeCanvas();
      // Pool size depends on width — reseed (cheap, keeps density right).
      seededForRef.current = null;
      reseed();
      if (reducedMotion) drawStatic();
    }

    function onVisibility() {
      last = 0;
      if (!reducedMotion) rafId = requestAnimationFrame(loop);
    }

    sizeCanvas();
    reseed();

    if (reducedMotion) {
      drawStatic();
    } else {
      rafId = requestAnimationFrame(loop);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    const ro = new ResizeObserver(onResize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
