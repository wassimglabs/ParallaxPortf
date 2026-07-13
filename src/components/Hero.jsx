import { useEffect, useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PhotoCard from './PhotoCard';
import placeholderWork from '../data/placeholderWork';
import semsemLogo from '../assets/y444 (1).svg';

const HOVER_SELECTOR = 'a, button, [role="button"], .photo-card, .hero-logo, [data-cursor-hover]';

// --- room geometry -----------------------------------------------------
const CANVAS_WIDTH = 1680;
const CANVAS_HEIGHT = 980;

const LOGO_MOTION_LIMIT = 0.82;
const LOGO_PERSPECTIVE = 800;
const LOGO_Z = 60;
const LOGO_YAW = 42;
const LOGO_PITCH = 18;

// --- camera limits -------------------------------------------------------
const MAX_YAW = 14;
const MAX_PITCH = 8;
const EDGE_PADDING = 70;

// --- spring tuning: {stiffness, damping}, mass = 1 ------------------------
const SPRING_CAMERA = { stiffness: 62, damping: 14 };
const SPRING_SHIFT = { stiffness: 46, damping: 13 };
const SPRING_LOGO = { stiffness: 26, damping: 12 };
const SPRING_DOT = { stiffness: 500, damping: 45 };

const ARRANGED_SLOTS = [
  // Top strip
  { x: -0.03, y: 0.06, z: 80, rotate: 10 },
  { x: 0.27, y: 0.05, z: -130, rotate: 6 },
  { x: 0.52, y: 0.05, z: 160, rotate: 0 },
  { x: 0.84, y: 0.05, z: -60, rotate: -10 },

  // Side anchors around the protected logo space
  { x: -0.02, y: 0.37, z: -90, rotate: 6 },
  { x: 0.22, y: 0.43, z: 120, rotate: 3 },
  { x: 0.36, y: 0.56, z: -180, rotate: -2 },
  { x: 0.82, y: 0.41, z: 110, rotate: -7 },

  // Bottom strip
  { x: -0.02, y: 0.78, z: -130, rotate: -5 },
  { x: 0.22, y: 0.82, z: 110, rotate: -4 },
  { x: 0.50, y: 0.90, z: 210, rotate: 0 },
  { x: 0.84, y: 0.75, z: -90, rotate: 5 },

  // Extra edge pieces for the cropped-gallery feeling
  { x: 0.67, y: 0.10, z: -240, rotate: -5 },
  { x: 1.02, y: 0.70, z: 40, rotate: 4 },
];

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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
  const logoMotion = useRef({ x: 0, xVel: 0, y: 0, yVel: 0 });
  const dot = useRef({ x: 0, y: 0, xVel: 0, yVel: 0 });

  useEffect(() => {
    setCursorRoot(document.body);
  }, []);

  const layouts = useMemo(() => {
    const map = {};
    placeholderWork.forEach((item, index) => {
      const slot = ARRANGED_SLOTS[index % ARRANGED_SLOTS.length];
      const x = slot.x * CANVAS_WIDTH;
      const y = slot.y * CANVAS_HEIGHT;

      map[item.id] = {
        x,
        y,
        z: slot.z,
        rotate: slot.rotate,
        stack: Math.round(slot.z + 500),
      };
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

    const handlePointerDown = () => {
      if (!dotRef.current) return;
      dotRef.current.classList.remove('is-clicking');
      void dotRef.current.offsetWidth;
      dotRef.current.classList.add('is-clicking');
    };
    window.addEventListener('pointerdown', handlePointerDown);

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

      if (stageRef.current) {
        stageRef.current.style.setProperty('--card-look-yaw', `${-camera.current.yaw * 0.68}deg`);
        stageRef.current.style.setProperty('--card-look-pitch', `${-camera.current.pitch * 0.62}deg`);
        stageRef.current.style.setProperty('--card-look-skew', `${-nx * 1.4}deg`);
      }

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

      // 3. elastic logo response, separate from the video/camera motion
      [logoMotion.current.x, logoMotion.current.xVel] = stepSpring(
        logoMotion.current.x, logoMotion.current.xVel, nx,
        SPRING_LOGO.stiffness, SPRING_LOGO.damping, dt
      );
      [logoMotion.current.y, logoMotion.current.yVel] = stepSpring(
        logoMotion.current.y, logoMotion.current.yVel, ny,
        SPRING_LOGO.stiffness, SPRING_LOGO.damping, dt
      );

      // 4. cursor dot
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
        const lx = clamp(logoMotion.current.x, -LOGO_MOTION_LIMIT, LOGO_MOTION_LIMIT);
        const ly = clamp(logoMotion.current.y, -LOGO_MOTION_LIMIT, LOGO_MOTION_LIMIT);
        const logoYaw = lx * LOGO_YAW;
        const logoPitch = -ly * LOGO_PITCH;
        logoRef.current.style.transform =
          `translate(-50%, -50%) translateZ(${LOGO_Z}px) ` +
          `perspective(${LOGO_PERSPECTIVE}px) ` +
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
      window.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  const cursor = (
    <div ref={dotRef} className="cursor-dot" aria-hidden="true">
      <div className="cursor-dot-inner" />
    </div>
  );

  const logo = (
    <div ref={logoRef} className="hero-logo" aria-hidden="true">
      <img
        className="hero-logo-mark"
        src={semsemLogo}
        alt=""
        draggable={false}
      />
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
          href={`/work/${item.slug}`}
        />
      ))}
      </div>
      {cursorRoot ? createPortal(logo, cursorRoot) : logo}
      {cursorRoot ? createPortal(cursor, cursorRoot) : null}
    </div>
  );
}
