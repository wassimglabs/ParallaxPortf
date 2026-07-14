import { useEffect, useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PhotoCard from './PhotoCard';
import placeholderWork from '../data/placeholderWork';
import semsemLogo from '../assets/y444 (1).svg';
import useDeviceCapabilities from '../hooks/useDeviceCapabilities';

const HOVER_SELECTOR = 'a, button, [role="button"], .photo-card, .hero-logo, [data-cursor-hover]';

// --- room geometry -----------------------------------------------------
const BASE_CANVAS_WIDTH = 1680;
const BASE_CANVAS_HEIGHT = 980;
const CANVAS_OVERSCAN_X = 1.22;
const CANVAS_OVERSCAN_Y = 1.18;

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
const TOUCH_DRAG_INTENT_PX = 8;
const TOUCH_PAN_POWER = 2.35;

const ARRANGED_SLOTS = [
  // Upper field
  { x: 0.1, y: 0.18, z: 80, rotate: 10, scale: 0.86 },
  { x: 0.29, y: 0.15, z: -150, rotate: 6, scale: 0.76 },
  { x: 0.66, y: 0.15, z: 160, rotate: -2, scale: 0.8 },
  { x: 0.9, y: 0.21, z: -70, rotate: -10, scale: 0.86 },

  // Lower field
  { x: 0.07, y: 0.74, z: -100, rotate: -6 },
  { x: 0.32, y: 0.88, z: 140, rotate: -4 },
  { x: 0.66, y: 0.82, z: -190, rotate: 3 },
  { x: 0.94, y: 0.70, z: 110, rotate: 7 },

  // Bottom strip
  { x: 0.1, y: 0.78, z: -130, rotate: -5 },
  { x: 0.22, y: 0.82, z: 110, rotate: -4 },
  { x: 0.50, y: 0.90, z: 210, rotate: 0 },
  { x: 0.82, y: 0.75, z: -90, rotate: 5 },

  // Extra edge pieces keep the scattered-gallery feeling without clipping the media.
  { x: 0.67, y: 0.10, z: -240, rotate: -5 },
  { x: 0.9, y: 0.70, z: 40, rotate: 4 },
];

const STAR_FIELD = Array.from({ length: 64 }, (_, index) => {
  const sideIndex = index % 4;
  const laneIndex = Math.floor(index / 4);
  const spread = ((laneIndex % 16) + 0.5) / 16;
  const jitterA = (((index * 37) % 19) - 9) / 180;
  const jitterB = (((index * 29) % 17) - 8) / 170;

  let x;
  let y;

  if (sideIndex === 0) {
    x = -0.16 + ((laneIndex * 7) % 6) * 0.055;
    y = spread + jitterA;
  } else if (sideIndex === 1) {
    x = 1.16 - ((laneIndex * 5) % 6) * 0.055;
    y = 1 - spread + jitterA;
  } else if (sideIndex === 2) {
    x = -0.08 + spread * 1.16 + jitterA;
    y = -0.1 + ((laneIndex * 3) % 5) * 0.048 + jitterB;
  } else {
    x = 1.08 - spread * 1.16 + jitterA;
    y = 1.1 - ((laneIndex * 4) % 5) * 0.048 + jitterB;
  }

  x = Math.min(Math.max(x, -0.18), 1.18);
  y = Math.min(Math.max(y, -0.12), 1.12);

  return {
    x,
    y,
    size: index % 11 === 0 ? 5 : index % 3 === 0 ? 4 : 3,
    delay: ((index * 0.37) % 4.2).toFixed(2),
    depth: -90 - (index % 5) * 46,
  };
});

const PHONE_VISIBLE_STARS = [
  { x: 0.18, y: 0.16, size: 8, delay: 0.35 },
  { x: 0.5, y: 0.1, size: 6, delay: 1.7 },
  { x: 0.82, y: 0.18, size: 8, delay: 2.45 },
  { x: 0.12, y: 0.38, size: 7, delay: 1.15 },
  { x: 0.9, y: 0.42, size: 7, delay: 3.05 },
  { x: 0.15, y: 0.68, size: 8, delay: 2.05 },
  { x: 0.85, y: 0.66, size: 8, delay: 0.85 },
  { x: 0.34, y: 0.88, size: 6, delay: 1.45 },
  { x: 0.68, y: 0.86, size: 7, delay: 2.7 },
  { x: 0.92, y: 0.78, size: 5, delay: 0.15 },
  { x: 0.08, y: 0.82, size: 5, delay: 2.25 },
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
  const activeCardRef = useRef(null);
  const routingCardClick = useRef(false);
  const [cursorRoot, setCursorRoot] = useState(null);
  const { prefersReducedMotion, supportsHoverEffects, supportsCustomCursor } = useDeviceCapabilities();
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const pointer = useRef({ x: 0, y: 0 }); 
  const touchDrag = useRef({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
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

  useEffect(() => {
    const syncViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  const canvasSize = useMemo(() => ({
    width: Math.max(BASE_CANVAS_WIDTH, viewport.width * CANVAS_OVERSCAN_X),
    height: Math.max(BASE_CANVAS_HEIGHT, viewport.height * CANVAS_OVERSCAN_Y),
  }), [viewport.height, viewport.width]);

  const layouts = useMemo(() => {
    const map = {};
    placeholderWork.forEach((item, index) => {
      const slot = ARRANGED_SLOTS[index % ARRANGED_SLOTS.length];
      const x = slot.x * canvasSize.width;
      const y = slot.y * canvasSize.height;
      const width = Math.round(item.width * (slot.scale ?? 1));

      map[item.id] = {
        x,
        y,
        width,
        z: slot.z,
        rotate: slot.rotate,
        stack: Math.round(slot.z + 500),
      };
    });
    
    return map;
  }, [canvasSize.height, canvasSize.width]);

  const getCardAtPoint = (clientX, clientY) => {
    const stage = stageRef.current;
    if (!stage) return null;

    const stageRect = stage.getBoundingClientRect();
    if (
      clientX < stageRect.left ||
      clientX > stageRect.right ||
      clientY < stageRect.top ||
      clientY > stageRect.bottom
    ) {
      return null;
    }

    const cards = [...stage.querySelectorAll('.photo-card.is-entered')];
    let bestCard = null;
    let bestDistance = Infinity;

    cards.forEach((card) => {
      const hitArea = card.querySelector('.photo-card-media') || card.querySelector('.photo-card-surface');
      const rect = hitArea?.getBoundingClientRect();
      if (!rect) return;
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = (clientX - centerX) ** 2 + (clientY - centerY) ** 2;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestCard = card;
      }
    });

    return bestCard;
  };

  const setActiveCard = (card) => {
    if (activeCardRef.current === card) return;

    activeCardRef.current?.classList.remove('is-pointer-active');
    activeCardRef.current = card;

    if (card) {
      card.classList.add('is-pointer-active');
      dotRef.current?.classList.add('is-hovering');
      return;
    }

    dotRef.current?.classList.remove('is-hovering');
  };

  useEffect(() => {
    if (!supportsHoverEffects) {
      setActiveCard(null);
      return undefined;
    }

    const handlePointerMove = (event) => {
      const externalInteractive = event.target.closest('a, button, [role="button"], [data-cursor-hover]');
      if (externalInteractive && !stageRef.current?.contains(externalInteractive)) {
        setActiveCard(null);
        return;
      }

      setActiveCard(getCardAtPoint(event.clientX, event.clientY));
    };

    const handlePointerLeave = () => {
      setActiveCard(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      setActiveCard(null);
    };
  }, [supportsHoverEffects]);

  const handleStageClickCapture = (event) => {
    if (!supportsHoverEffects) return;
    if (routingCardClick.current) return;
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const targetCard = getCardAtPoint(event.clientX, event.clientY);
    if (!targetCard) return;
    if (event.target.closest('.photo-card') === targetCard) return;

    event.preventDefault();
    event.stopPropagation();
    routingCardClick.current = true;
    targetCard.click();
    routingCardClick.current = false;
  };

  const handleTouchExploreStart = (event) => {
    if (supportsHoverEffects || event.pointerType === 'mouse') return;
    if (event.target.closest('button, [role="button"], [data-cursor-hover]')) return;

    touchDrag.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pointer.current.x,
      originY: pointer.current.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleTouchExploreMove = (event) => {
    if (supportsHoverEffects || !touchDrag.current.active || touchDrag.current.pointerId !== event.pointerId) return;

    const dx = event.clientX - touchDrag.current.startX;
    const dy = event.clientY - touchDrag.current.startY;
    const distance = Math.hypot(dx, dy);
    if (distance > TOUCH_DRAG_INTENT_PX) {
      touchDrag.current.moved = true;
    }

    pointer.current.x = clamp(
      touchDrag.current.originX - (dx / Math.max(window.innerWidth, 1)) * TOUCH_PAN_POWER,
      -1,
      1,
    );
    pointer.current.y = clamp(
      touchDrag.current.originY - (dy / Math.max(window.innerHeight, 1)) * TOUCH_PAN_POWER,
      -1,
      1,
    );
  };

  const handleTouchExploreEnd = (event) => {
    if (supportsHoverEffects || !touchDrag.current.active || touchDrag.current.pointerId !== event.pointerId) return;

    const wasTap = !touchDrag.current.moved;
    touchDrag.current.active = false;

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!wasTap) return;

    const targetCard = getCardAtPoint(event.clientX, event.clientY);
    if (!targetCard) return;

    event.preventDefault();
    targetCard.click();
  };

  const handleTouchExploreCancel = (event) => {
    if (supportsHoverEffects || !touchDrag.current.active || touchDrag.current.pointerId !== event.pointerId) return;

    touchDrag.current.active = false;

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    reduceMotion.current = prefersReducedMotion;
    lastTime.current = null;

    if (reduceMotion.current) {
      if (canvasRef.current) {
        canvasRef.current.style.transform = 'translate(-50%, -50%)';
      }
      if (logoRef.current) {
        logoRef.current.style.transform = 'translate(-50%, -50%)';
      }
      return undefined;
    }

    const handleMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (supportsHoverEffects) {
      window.addEventListener('mousemove', handleMove);
    }

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
    if (supportsCustomCursor) {
      window.addEventListener('mouseover', handleOver);
      window.addEventListener('mouseout', handleOut);
    }

    const handlePointerDown = () => {
      if (!dotRef.current) return;
      dotRef.current.classList.remove('is-clicking');
      void dotRef.current.offsetWidth;
      dotRef.current.classList.add('is-clicking');
    };
    if (supportsCustomCursor) {
      window.addEventListener('pointerdown', handlePointerDown);
    }

    const tick = (time) => {
      if (lastTime.current === null) lastTime.current = time;
      const dt = Math.min((time - lastTime.current) / 1000, 1 / 30);
      lastTime.current = time;

      const nx = shapeInput(pointer.current.x);
      const ny = shapeInput(pointer.current.y);

      const motionScale = supportsHoverEffects ? 1 : 0.58;
      const targetYaw = nx * MAX_YAW * motionScale;
      const targetPitch = -ny * MAX_PITCH * motionScale;
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
        stageRef.current.style.setProperty('--card-look-skew', `${-nx * 1.4 * motionScale}deg`);
      }

      const panRangeX = Math.max((canvasSize.width - window.innerWidth) / 2, 0) + EDGE_PADDING;
      const panRangeY = Math.max((canvasSize.height - window.innerHeight) / 2, 0) + EDGE_PADDING * 0.6;
      const targetShiftX = -nx * panRangeX;
      const targetShiftY = -ny * panRangeY;
      [shift.current.x, shift.current.xVel] = stepSpring(
        shift.current.x, shift.current.xVel, targetShiftX,
        SPRING_SHIFT.stiffness,
        SPRING_SHIFT.damping,
        dt,
      );
      [shift.current.y, shift.current.yVel] = stepSpring(
        shift.current.y,
        shift.current.yVel,
        targetShiftY,
        SPRING_SHIFT.stiffness,
        SPRING_SHIFT.damping,
        dt,
      );

      const scrollRoot = stageRef.current?.closest('.app');
      const maxScroll = scrollRoot ? scrollRoot.scrollHeight - scrollRoot.clientHeight : 0;
      const scrollProgress = maxScroll > 0 ? scrollRoot.scrollTop / maxScroll : 0;
      const seconds = time / 1000;
      const logoInputX = supportsHoverEffects ? nx * 0.78 : nx * 0.56;
      const logoInputY = supportsHoverEffects ? ny * 0.5 : ny * 0.42;
      const idleX = Math.sin(seconds * 0.42 + scrollProgress * 5.2) * 0.12;
      const idleY = Math.cos(seconds * 0.36 + scrollProgress * 4.1) * 0.1 + (scrollProgress - 0.5) * 0.08;
      const autoX = logoInputX + idleX;
      const autoY = logoInputY + idleY;

      [logoMotion.current.x, logoMotion.current.xVel] = stepSpring(
        logoMotion.current.x, logoMotion.current.xVel, autoX,
        SPRING_LOGO.stiffness, SPRING_LOGO.damping, dt
      );
      [logoMotion.current.y, logoMotion.current.yVel] = stepSpring(
        logoMotion.current.y, logoMotion.current.yVel, autoY,
        SPRING_LOGO.stiffness, SPRING_LOGO.damping, dt
      );

      if (supportsCustomCursor) {
        const targetDotX = (pointer.current.x * window.innerWidth) / 2 + window.innerWidth / 2;
        const targetDotY = (pointer.current.y * window.innerHeight) / 2 + window.innerHeight / 2;
        [dot.current.x, dot.current.xVel] = stepSpring(
          dot.current.x, dot.current.xVel, targetDotX, SPRING_DOT.stiffness, SPRING_DOT.damping, dt
        );
        [dot.current.y, dot.current.yVel] = stepSpring(
          dot.current.y, dot.current.yVel, targetDotY, SPRING_DOT.stiffness, SPRING_DOT.damping, dt
        );
      }

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
        const logoDepth = supportsHoverEffects ? LOGO_Z : 150;
        const logoScale = supportsHoverEffects ? 1 : 1.16 + Math.abs(lx) * 0.06;
        logoRef.current.style.transform =
          `translate(-50%, -50%) translateZ(${logoDepth}px) ` +
          `perspective(${LOGO_PERSPECTIVE}px) ` +
          `rotateX(${logoPitch}deg) rotateY(${logoYaw}deg) ` +
          `scale(${logoScale})`;
      }

      if (dotRef.current && supportsCustomCursor) {
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
  }, [canvasSize.height, canvasSize.width, prefersReducedMotion, supportsCustomCursor, supportsHoverEffects]);

  const cursor = (
    <div ref={dotRef} className="cursor-dot" aria-hidden="true">
      <div className="cursor-dot-inner" />
    </div>
  );

  const logo = (
    <div ref={logoRef} className={`hero-logo${supportsHoverEffects ? '' : ' is-touch-logo'}`} aria-hidden="true">
      <img
        className="hero-logo-mark"
        src={semsemLogo}
        alt=""
        draggable={false}
      />
    </div>
  );

  const phoneStars = (
    <div className="hero-phone-stars" aria-hidden="true">
      {PHONE_VISIBLE_STARS.map((star, index) => (
        <span
          key={`phone-${star.x}-${star.y}`}
          className="hero-star hero-phone-star"
          style={{
            left: `${star.x * 100}%`,
            top: `${star.y * 100}%`,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
            animationDuration: `${3.6 + (index % 4) * 0.44}s`,
          }}
        />
      ))}
    </div>
  );

  return (
    <div
      ref={stageRef}
      className={`hero-stage${supportsHoverEffects ? '' : ' is-touch-layout'}`}
      onClickCapture={handleStageClickCapture}
      onPointerDown={handleTouchExploreStart}
      onPointerMove={handleTouchExploreMove}
      onPointerUp={handleTouchExploreEnd}
      onPointerCancel={handleTouchExploreCancel}
    >
      {phoneStars}
      <div
        ref={canvasRef}
        className="hero-canvas"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          left: '50%',
          top: '50%',
          transformOrigin: 'center center',
        }}
      >
        <div className="hero-stars" aria-hidden="true">
          {STAR_FIELD.map((star, index) => (
            <span
              key={`${star.x}-${star.y}`}
              className="hero-star"
              style={{
                left: star.x * canvasSize.width,
                top: star.y * canvasSize.height,
                width: star.size,
                height: star.size,
                '--star-depth': `${star.depth}px`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${3.8 + (index % 5) * 0.42}s`,
              }}
            />
          ))}
        </div>
       {placeholderWork.map((item, i) => (
        <PhotoCard 
          key={item.id} 
          index={i}
          client={item.client}
          title={item.title}
          video={item.video}
          poster={item.poster}
          images={item.images}
          width={layouts[item.id].width}
          layout={layouts[item.id]} 
          href={`/work/${item.slug}`}
        />
      ))}
      </div>
      {cursorRoot ? createPortal(logo, cursorRoot) : logo}
      {supportsCustomCursor && cursorRoot ? createPortal(cursor, cursorRoot) : null}
    </div>
  );
}
