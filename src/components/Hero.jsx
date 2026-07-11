import { useEffect, useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PhotoCard from './PhotoCard';
import placeholderWork from '../data/placeholderWork';

const LOGO_TEXT = 'HANZOUTI'; // swap for your actual wordmark

const HOVER_SELECTOR = '.photo-card, .hero-logo, [data-cursor-hover]';

// --- room geometry -----------------------------------------------------
const CANVAS_WIDTH = 2700;
const CANVAS_HEIGHT = 1650;

// how far cards sit from the "back wall" (px, mapped to translateZ)
const DEPTH_MIN = -260;
const DEPTH_MAX = 260;

const LOGO_YAW_MULT = 2.4; 
const LOGO_PITCH_MULT = 2.1;
const LOGO_DRIFT = 18; 

// --- camera limits -------------------------------------------------------
const MAX_YAW = 14; 
const MAX_PITCH = 9; 
const EDGE_PADDING = 100; 

// --- spring tuning: {stiffness, damping}, mass = 1 ------------------------
const SPRING_CAMERA = { stiffness: 62, damping: 14 };
const SPRING_SHIFT = { stiffness: 46, damping: 13 };
const SPRING_DOT = { stiffness: 500, damping: 45 };

function stepSpring(pos, vel, target, stiffness, damping, dt) {
  const accel = (target - pos) * stiffness - vel * damping;
  const nextVel = vel + accel * dt;
  const nextPos = pos + nextVel * dt;
  return [nextPos, nextVel];
}

function shapeInput(v) {
  const k = 1.35;
  return Math.tanh(v * k) / Math.tanh(k);
}

export default function Hero() {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const logoRef = useRef(null);
  const dotRef = useRef(null);
  const [cursorRoot, setCursorRoot] = useState(null);

  const pointer = useRef({ x: 0, y: 0 }); 
  const rafId = useRef(null);
  const lastTime = useRef(null);
  const reduceMotion = useRef(false);

  const camera = useRef({ yaw: 0, yawVel: 0, pitch: 0, pitchVel: 0 });
  const shift = useRef({ x: 0, xVel: 0, y: 0, yVel: 0 });
  const dot = useRef({ x: 0, y: 0, xVel: 0, yVel: 0 });

  useEffect(() => {
    setCursorRoot(document.body);
  }, []);

  // --- Advanced Distribution Logic ("Dart Throwing") ---
  const layouts = useMemo(() => {
    const map = {};
    const placed = []; // Keep track of coordinates we've already claimed
    
    // Stable pseudo-random generator
    const pseudoRandom = (seed) => {
      const h = Math.sin(seed * 12.9898) * 43758.5453;
      return h - Math.floor(h);
    };

    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    
    // --- TUNING VARIABLES ---
    // Increase this to force cards further apart. Decrease to allow more overlap.
    const MIN_DIST = 380; 
    // Radius of the empty void protecting your logo
    const CENTER_CLEARANCE = 450; 

    placeholderWork.forEach((item, index) => {
      let x, y;
      let valid = false;
      let attempts = 0;

      // "Dart throwing" algorithm: try finding a spot up to 100 times per card
      while (!valid && attempts < 100) {
        // Generate a candidate spot
        x = pseudoRandom(item.id + index * 100 + attempts) * CANVAS_WIDTH;
        y = pseudoRandom(item.id + index * 200 + attempts) * CANVAS_HEIGHT;

        // 1. Is it too close to the logo?
        const distToCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distToCenter < CENTER_CLEARANCE) {
          attempts++;
          continue;
        }

        // 2. Is it too close to any already-placed cards?
        let tooClose = false;
        for (let i = 0; i < placed.length; i++) {
          const dist = Math.sqrt((x - placed[i].x) ** 2 + (y - placed[i].y) ** 2);
          if (dist < MIN_DIST) {
            tooClose = true;
            break;
          }
        }

        // If it passed both checks, we found a great spot!
        if (!tooClose) {
          valid = true;
        } else {
          attempts++;
        }
      }

      // Fallback: If canvas gets super crowded and it fails 100 times, force a spot
      // just outside the center clearance ring.
      if (!valid) {
        x = pseudoRandom(item.id + 1000) * CANVAS_WIDTH;
        y = pseudoRandom(item.id + 2000) * CANVAS_HEIGHT;
        const distToCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distToCenter < CENTER_CLEARANCE) {
          const angle = Math.atan2(y - centerY, x - centerX);
          x = centerX + Math.cos(angle) * (CENTER_CLEARANCE + 50);
          y = centerY + Math.sin(angle) * (CENTER_CLEARANCE + 50);
        }
      }

      // Save the approved coordinates
      placed.push({ x, y });

      // Calculate depth and rotation (tilt)
      const z = DEPTH_MIN + pseudoRandom(item.id * 3) * (DEPTH_MAX - DEPTH_MIN);
      const rotate = -12 + pseudoRandom(item.id * 4) * 24;

      map[item.id] = { z, rotate, x, y };
    });
    
    return map;
  }, []);

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion.current) return; 

    const handleMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', handleMove);

    const handleOver = (e) => {
      if (e.target.closest(HOVER_SELECTOR)) {
        dotRef.current?.classList.add('is-hovering');
      }
    };
    const handleOut = (e) => {
      const target = e.target.closest(HOVER_SELECTOR);
      if (!target) return;
      if (target.contains(e.relatedTarget)) return;
      dotRef.current?.classList.remove('is-hovering');
    };
    window.addEventListener('mouseover', handleOver);
    window.addEventListener('mouseout', handleOut);

    const tick = (time) => {
      if (lastTime.current === null) lastTime.current = time;
      const dt = Math.min((time - lastTime.current) / 1000, 1 / 30);
      lastTime.current = time;

      const nx = shapeInput(pointer.current.x);
      const ny = shapeInput(pointer.current.y);

      // 1. camera rotation
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

      // 2. explore pan
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

      // 3. cursor dot
      const targetDotX = (pointer.current.x * window.innerWidth) / 2 + window.innerWidth / 2;
      const targetDotY = (pointer.current.y * window.innerHeight) / 2 + window.innerHeight / 2;
      [dot.current.x, dot.current.xVel] = stepSpring(
        dot.current.x, dot.current.xVel, targetDotX, SPRING_DOT.stiffness, SPRING_DOT.damping, dt
      );
      [dot.current.y, dot.current.yVel] = stepSpring(
        dot.current.y, dot.current.yVel, targetDotY, SPRING_DOT.stiffness, SPRING_DOT.damping, dt
      );

      // --- apply transforms ---

      if (canvasRef.current) {
        canvasRef.current.style.transform =
          `translate(-50%, -50%) ` +
          `translate(${shift.current.x}px, ${shift.current.y}px) ` +
          `rotateX(${camera.current.pitch}deg) rotateY(${camera.current.yaw}deg)`;
      }

      if (logoRef.current) {
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
      window.removeEventListener('mouseover', handleOver);
      window.removeEventListener('mouseout', handleOut);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  const cursor = (
    <div ref={dotRef} className="cursor-dot" aria-hidden="true">
      <div className="cursor-dot-inner" />
    </div>
  );

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
       {placeholderWork.map((item, i) => (
        <PhotoCard 
          key={item.id} 
          index={i}
          client={item.client}
          title={item.title}
          video={item.video}
          width={item.width} 
          layout={layouts[item.id]} 
        />
      ))}
      </div>
      <div ref={logoRef} className="hero-logo" aria-hidden="true">
        {LOGO_TEXT}
      </div>
      {cursorRoot ? createPortal(cursor, cursorRoot) : null}
    </div>
  );
}
