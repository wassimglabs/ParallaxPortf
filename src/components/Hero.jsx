import { useEffect, useRef, useMemo } from 'react';
import PhotoCard from './PhotoCard';
import placeholderWork from '../data/placeholderWork';

const LOGO_TEXT = 'STUDIO'; // swap for your actual wordmark

// --- room geometry -----------------------------------------------------
const CANVAS_WIDTH = 2700;
const CANVAS_HEIGHT = 1650;

// how far cards sit from the "back wall" (px, mapped to translateZ)
const DEPTH_MIN = -260;
const DEPTH_MAX = 260;

// the logo is the pivot the camera orbits, not a parallax layer — it
// stays framed near center but turns harder than the room itself, the
// way a wide sign foreshortens dramatically as you walk around it
const LOGO_YAW_MULT = 2.4; // logo rotates this many × the room's yaw
const LOGO_PITCH_MULT = 2.1;
const LOGO_DRIFT = 18; // px — a hint of life, not a sweep

// --- camera limits -------------------------------------------------------
const MAX_YAW = 14; // deg
const MAX_PITCH = 9; // deg
const EDGE_PADDING = 100; // px of extra travel past the exact viewport edge

// --- spring tuning: {stiffness, damping}, mass = 1 ------------------------
// camera rotation: slightly under critical damping (~0.9x) for a hint of
// natural overshoot-and-settle, like real neck weight
const SPRING_CAMERA = { stiffness: 62, damping: 14 };
// weight-shift translation: close to critical, no visible overshoot
const SPRING_SHIFT = { stiffness: 46, damping: 13 };
// cursor dot: stiff and ~critically damped, tight tracking, no float
const SPRING_DOT = { stiffness: 500, damping: 45 };

function stepSpring(pos, vel, target, stiffness, damping, dt) {
  const accel = (target - pos) * stiffness - vel * damping;
  const nextVel = vel + accel * dt;
  const nextPos = pos + nextVel * dt;
  return [nextPos, nextVel];
}

// saturating response: sensitive near center, eases off toward the edges —
// a head doesn't rotate linearly with how far off-center you're looking
function shapeInput(v) {
  const k = 1.35;
  return Math.tanh(v * k) / Math.tanh(k);
}

export default function Hero() {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const logoRef = useRef(null);
  const dotRef = useRef(null);

  const pointer = useRef({ x: 0, y: 0 }); // raw normalized target, -1..1
  const rafId = useRef(null);
  const lastTime = useRef(null);
  const reduceMotion = useRef(false);

  // single source of truth: everything else is derived from this each frame
  const camera = useRef({ yaw: 0, yawVel: 0, pitch: 0, pitchVel: 0 });
  const shift = useRef({ x: 0, xVel: 0, y: 0, yVel: 0 });
  const dot = useRef({ x: 0, y: 0, xVel: 0, yVel: 0 });

  // deterministic per-card depth so the room has real volume without
  // touching placeholderWork.js — stable across renders, varies by id
  const depths = useMemo(() => {
    const map = {};
    placeholderWork.forEach((item) => {
      const h = Math.sin(item.id * 12.9898) * 43758.5453;
      const frac = h - Math.floor(h);
      map[item.id] = DEPTH_MIN + frac * (DEPTH_MAX - DEPTH_MIN);
    });
    return map;
  }, []);

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion.current) return; // leave everything static

    const handleMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', handleMove);

    const tick = (time) => {
      if (lastTime.current === null) lastTime.current = time;
      // clamp dt so a dropped frame / tab switch can't fling the springs
      const dt = Math.min((time - lastTime.current) / 1000, 1 / 30);
      lastTime.current = time;

      const nx = shapeInput(pointer.current.x);
      const ny = shapeInput(pointer.current.y);

      // 1. camera rotation — the "head turning"
      const targetYaw = nx * MAX_YAW;
      const targetPitch = -ny * MAX_PITCH;
      [camera.current.yaw, camera.current.yawVel] = stepSpring(
        camera.current.yaw, camera.current.yawVel, targetYaw,
        SPRING_CAMERA.stiffness, SPRING_CAMERA.damping, dt
      );
      [camera.current.pitch, camera.current.pitchVel] = stepSpring(
        camera.current.pitch, camera.current.pitchVel, targetPitch,
        SPRING_CAMERA.stiffness, SPRING_CAMERA.damping, dt
      );

      // 2. explore pan — doubles as the "weight shift" of a head turn.
      // Range is derived from canvas vs. viewport size so the full room
      // is always reachable, on any screen, not a guessed fixed number.
      const panRangeX = Math.max((CANVAS_WIDTH - window.innerWidth) / 2, 0) + EDGE_PADDING;
      const panRangeY = Math.max((CANVAS_HEIGHT - window.innerHeight) / 2, 0) + EDGE_PADDING * 0.6;
      const targetShiftX = -nx * panRangeX;
      const targetShiftY = -ny * panRangeY;
      [shift.current.x, shift.current.xVel] = stepSpring(
        shift.current.x, shift.current.xVel, targetShiftX,
        SPRING_SHIFT.stiffness, SPRING_SHIFT.damping, dt
      );
      [shift.current.y, shift.current.yVel] = stepSpring(
        shift.current.y, shift.current.yVel, targetShiftY,
        SPRING_SHIFT.stiffness, SPRING_SHIFT.damping, dt
      );

      // 3. cursor dot — near-instant, just enough spring to kill raw jitter
      const targetDotX = (pointer.current.x * window.innerWidth) / 2 + window.innerWidth / 2;
      const targetDotY = (pointer.current.y * window.innerHeight) / 2 + window.innerHeight / 2;
      [dot.current.x, dot.current.xVel] = stepSpring(
        dot.current.x, dot.current.xVel, targetDotX, SPRING_DOT.stiffness, SPRING_DOT.damping, dt
      );
      [dot.current.y, dot.current.yVel] = stepSpring(
        dot.current.y, dot.current.yVel, targetDotY, SPRING_DOT.stiffness, SPRING_DOT.damping, dt
      );

      // --- apply transforms, all derived from camera/shift state ---

      if (canvasRef.current) {
        // real 3D: cards carry their own translateZ (see PhotoCard), and
        // this rotates the whole rigid room about its center — depth
        // parallax between cards comes from the browser's 3D engine,
        // not a hand-faked per-layer multiplier
        canvasRef.current.style.transform =
          `translate(-50%, -50%) ` +
          `translate(${shift.current.x}px, ${shift.current.y}px) ` +
          `rotateX(${camera.current.pitch}deg) rotateY(${camera.current.yaw}deg)`;
      }

      if (logoRef.current) {
        // no skew, no lever-sweep: the logo shares the stage's own
        // `perspective` (it's a fixed-position descendant, which makes
        // .hero-stage its containing block), so real rotateX/rotateY
        // here produces genuine foreshortening across the wide wordmark
        // — one side stretches, the other compresses, like walking
        // around a sign rather than watching it fly past
        const logoYaw = camera.current.yaw * LOGO_YAW_MULT;
        const logoPitch = camera.current.pitch * LOGO_PITCH_MULT;
        const driftX = nx * LOGO_DRIFT;
        const driftY = -ny * LOGO_DRIFT * 0.6;
        logoRef.current.style.transform =
          `translate(calc(-50% + ${driftX}px), calc(-50% + ${driftY}px)) ` +
          `rotateX(${logoPitch}deg) rotateY(${logoYaw}deg)`;
      }

      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate(${dot.current.x - 7}px, ${dot.current.y - 7}px)`;
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div ref={stageRef} className="hero-stage">
      <div
        ref={canvasRef}
        className="hero-canvas"
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          left: '50%',
          top: '50%',
          transformOrigin: 'center center',
        }}
      >
        {placeholderWork.map((item) => (
          <PhotoCard key={item.id} {...item} depth={depths[item.id]} />
        ))}
      </div>
      <div ref={logoRef} className="hero-logo" aria-hidden="true">
        {LOGO_TEXT}
      </div>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </div>
  );
}