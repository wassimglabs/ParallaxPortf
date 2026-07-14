import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import semsemLogo from '../assets/y444 (1).svg';
import ownerPortrait from '../assets/IMG_E3752.JPG';
import useDeviceCapabilities from '../hooks/useDeviceCapabilities';

const HOVER_SELECTOR = 'a, button, [role="button"], [data-cursor-hover]';
const CURSOR_SPRING = { stiffness: 480, damping: 42 };
const INTRO_FLIP_DELAY_MS = 1050;

function stepSpring(pos, vel, target, stiffness, damping, dt) {
  const accel = (target - pos) * stiffness - vel * damping;
  const nextVel = vel + accel * dt;
  const nextPos = pos + nextVel * dt;
  return [nextPos, nextVel];
}

export default function AboutPage() {
  const dotRef = useRef(null);
  const { supportsCustomCursor } = useDeviceCapabilities();
  const rafId = useRef(null);
  const lastTime = useRef(null);
  const pointer = useRef({ x: 0, y: 0 });
  const dot = useRef({
    x: typeof window === 'undefined' ? 0 : window.innerWidth / 2,
    y: typeof window === 'undefined' ? 0 : window.innerHeight / 2,
    xVel: 0,
    yVel: 0,
  });
  const [cursorRoot, setCursorRoot] = useState(null);
  const [introComplete, setIntroComplete] = useState(false);
  const [logoPreview, setLogoPreview] = useState(false);

  useEffect(() => {
    setCursorRoot(document.body);
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setIntroComplete(true);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setIntroComplete(true);
    }, INTRO_FLIP_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!supportsCustomCursor) {
      return undefined;
    }

    lastTime.current = null;

    const handleMove = (event) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const handleOver = (event) => {
      if (event.target.closest(HOVER_SELECTOR)) {
        dotRef.current?.classList.add('is-hovering');
      }
    };

    const handleOut = (event) => {
      const target = event.target.closest(HOVER_SELECTOR);
      if (!target) return;
      if (target.contains(event.relatedTarget)) return;
      dotRef.current?.classList.remove('is-hovering');
    };

    const handlePointerDown = () => {
      if (!dotRef.current) return;
      dotRef.current.classList.remove('is-clicking');
      void dotRef.current.offsetWidth;
      dotRef.current.classList.add('is-clicking');
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseover', handleOver);
    window.addEventListener('mouseout', handleOut);
    window.addEventListener('pointerdown', handlePointerDown);

    const tick = (time) => {
      if (lastTime.current === null) lastTime.current = time;
      const dt = Math.min((time - lastTime.current) / 1000, 1 / 30);
      lastTime.current = time;

      const targetDotX = (pointer.current.x * window.innerWidth) / 2 + window.innerWidth / 2;
      const targetDotY = (pointer.current.y * window.innerHeight) / 2 + window.innerHeight / 2;
      [dot.current.x, dot.current.xVel] = stepSpring(
        dot.current.x,
        dot.current.xVel,
        targetDotX,
        CURSOR_SPRING.stiffness,
        CURSOR_SPRING.damping,
        dt
      );
      [dot.current.y, dot.current.yVel] = stepSpring(
        dot.current.y,
        dot.current.yVel,
        targetDotY,
        CURSOR_SPRING.stiffness,
        CURSOR_SPRING.damping,
        dt
      );

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dot.current.x - 7}px, ${dot.current.y - 7}px)`;
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
  }, [supportsCustomCursor]);

  const showPortrait = introComplete && !logoPreview;

  const portrait = (
    <div
      className={`about-portrait-card${showPortrait ? ' is-showing-image' : ''}`}
      tabIndex={0}
      aria-label="Owner portrait. Hover to reveal the portfolio logo."
      data-cursor-hover
      onPointerEnter={() => setLogoPreview(true)}
      onPointerLeave={() => setLogoPreview(false)}
      onFocus={() => setLogoPreview(true)}
      onBlur={() => setLogoPreview(false)}
    >
      <div className="about-portrait-frame" aria-hidden="true">
        <div className="about-portrait-face about-portrait-logo">
          <img src={semsemLogo} alt="" draggable={false} />
        </div>
        <div className="about-portrait-face about-portrait-image">
          <img src={ownerPortrait} alt="" draggable={false} />
        </div>
      </div>
    </div>
  );

  const cursor = (
    <div ref={dotRef} className="cursor-dot" aria-hidden="true">
      <div className="cursor-dot-inner" />
    </div>
  );

  return (
    <main className="about-page">
      <header className="about-header">
        {cursorRoot ? null : portrait}
      </header>

      <section className="about-copy" aria-labelledby="about-heading">
        <div className="about-section-label">
          <h1 id="about-heading">About</h1>
        </div>
        <div className="about-divider" />

        <div className="about-statement">
          <p>
           I'm Mohamed Oussema Hanzouti, an audiovisual designer and filmmaker passionate about storytelling, cinematography, copywriting, and audiovisual advertising. I create visual experiences that combine creativity with strategy, transforming ideas into compelling films and brand content—from concept development to final production.
          </p>
          <p>
           I am currently studying Image Design, specializing in Audiovisual Advertising, at ESSTED (École Supérieure des Sciences et Techniques du Design) in Tunisia, where I continue to develop my skills in filmmaking, photography, visual communication, creative direction, and copywriting.          </p>
        </div>
      </section>

      <footer className="contact-footer">
        HANZOUTI 2026 - All rights reserved
      </footer>

      {cursorRoot ? createPortal(portrait, cursorRoot) : null}
      {supportsCustomCursor && cursorRoot ? createPortal(cursor, cursorRoot) : null}
    </main>
  );
}
