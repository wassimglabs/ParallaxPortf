import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import semsemLogo from '../assets/y444 (1).svg';
import useDeviceCapabilities from '../hooks/useDeviceCapabilities';

/**
 * @typedef {{ label: string, value: string, href: string, icon: 'mail' | 'whatsapp' | 'instagram' }} ContactEntry
 * @typedef {{ title: string, subtitle: string, entries: ContactEntry[] }} ContactBlock
 */

const DEFAULT_CONTACT_BLOCKS = [
  {
    title: 'Direct contact',
    subtitle: 'Project inquiries, collaborations, and availability',
    entries: [
      {
        label: 'Mail',
        value: 'oussemahanzouti59@gmail.com',
        href: 'https://mail.google.com/mail/?view=cm&fs=1&to=oussemahanzouti59%40gmail.com',
        icon: 'mail',
      },
      { label: 'WhatsApp', value: '+216 54 483 636', href: 'https://wa.me/21654483636', icon: 'whatsapp' },
      { label: 'Instagram', value: '@hanzouti_oussema', href: 'https://instagram.com/hanzouti_oussema', icon: 'instagram' },
    ],
  },
];

const HOVER_SELECTOR = 'a, button, [role="button"], [data-cursor-hover]';
const SPRING = { stiffness: 30, damping: 11 };
const CURSOR_SPRING = { stiffness: 480, damping: 42 };

function stepSpring(pos, vel, target, stiffness, damping, dt) {
  const accel = (target - pos) * stiffness - vel * damping;
  const nextVel = vel + accel * dt;
  const nextPos = pos + nextVel * dt;
  return [nextPos, nextVel];
}

function shapeInput(value) {
  return Math.tanh(value * 1.25) / Math.tanh(1.25);
}

function ContactIcon({ name }) {
  if (name === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.04 3.4a8.52 8.52 0 0 0-7.32 12.9l-.84 3.1 3.18-.82a8.5 8.5 0 1 0 4.98-15.18Z" />
        <path d="M9.18 7.82c-.18-.4-.38-.4-.56-.4h-.48c-.16 0-.43.06-.66.3-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.7 2.72 4.2 3.7 2.08.82 2.5.66 2.95.62.45-.04 1.46-.6 1.67-1.18.2-.58.2-1.08.14-1.18-.06-.1-.22-.16-.47-.29-.25-.12-1.46-.72-1.69-.8-.22-.08-.39-.12-.55.13-.16.24-.63.8-.77.96-.14.16-.28.18-.53.06-.24-.12-1.02-.38-1.95-1.2-.72-.65-1.2-1.44-1.34-1.68-.14-.25-.02-.38.1-.5.12-.11.25-.28.37-.42.12-.14.16-.25.24-.41.08-.16.04-.3-.02-.42-.06-.12-.54-1.32-.76-1.88Z" />
      </svg>
    );
  }

  if (name === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4.5" y="4.5" width="15" height="15" rx="4.2" />
        <circle cx="12" cy="12" r="3.35" />
        <circle cx="16.35" cy="7.65" r="0.72" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="m5.2 7.2 6.8 5.4 6.8-5.4" />
    </svg>
  );
}

export default function ContactPage({ blocks = DEFAULT_CONTACT_BLOCKS }) {
  const logoRef = useRef(null);
  const dotRef = useRef(null);
  const { prefersReducedMotion, supportsCustomCursor } = useDeviceCapabilities();
  const [cursorRoot, setCursorRoot] = useState(null);
  const rafId = useRef(null);
  const lastTime = useRef(null);
  const pointer = useRef({ x: 0, y: 0 });
  const logo = useRef({ x: 0, xVel: 0, y: 0, yVel: 0 });
  const dot = useRef({
    x: typeof window === 'undefined' ? 0 : window.innerWidth / 2,
    y: typeof window === 'undefined' ? 0 : window.innerHeight / 2,
    xVel: 0,
    yVel: 0,
  });

  useEffect(() => {
    setCursorRoot(document.body);
  }, []);

  useEffect(() => {
    const reduceMotion = prefersReducedMotion;
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

    if (supportsCustomCursor) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseover', handleOver);
      window.addEventListener('mouseout', handleOut);
      window.addEventListener('pointerdown', handlePointerDown);
    }

    const tick = (time) => {
      if (lastTime.current === null) lastTime.current = time;
      const dt = Math.min((time - lastTime.current) / 1000, 1 / 30);
      lastTime.current = time;

      const appRoot = document.querySelector('.app');
      const maxScroll = appRoot ? appRoot.scrollHeight - appRoot.clientHeight : 0;
      const scrollProgress = maxScroll > 0 ? appRoot.scrollTop / maxScroll : 0;
      const seconds = time / 1000;
      const nx = supportsCustomCursor
        ? shapeInput(pointer.current.x) * 0.18 + Math.sin(seconds * 0.34 + scrollProgress * 5.4) * 0.48
        : Math.sin(seconds * 0.34 + scrollProgress * 5.4) * 0.48;
      const ny = supportsCustomCursor
        ? shapeInput(pointer.current.y) * 0.12 + Math.cos(seconds * 0.3 + scrollProgress * 4.8) * 0.36
        : Math.cos(seconds * 0.3 + scrollProgress * 4.8) * 0.36;

      if (!reduceMotion) {
        [logo.current.x, logo.current.xVel] = stepSpring(
          logo.current.x,
          logo.current.xVel,
          nx,
          SPRING.stiffness,
          SPRING.damping,
          dt
        );
        [logo.current.y, logo.current.yVel] = stepSpring(
          logo.current.y,
          logo.current.yVel,
          ny,
          SPRING.stiffness,
          SPRING.damping,
          dt
        );

        if (logoRef.current) {
          const x = logo.current.x;
          const y = logo.current.y;
          logoRef.current.style.transform =
            `translate3d(${x * 24}px, ${y * 16}px, 0) ` +
            `perspective(760px) rotateX(${-y * 11}deg) rotateY(${x * 24}deg)`;
        }
      }

      if (supportsCustomCursor) {
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
      }

      if (dotRef.current && supportsCustomCursor) {
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
  }, [prefersReducedMotion, supportsCustomCursor]);

  const logoLink = (
    <a href="/" className="contact-logo" aria-label="Back to home" data-cursor-hover>
      <img ref={logoRef} src={semsemLogo} alt="Oussema" draggable={false} />
    </a>
  );

  const cursor = (
    <div ref={dotRef} className="cursor-dot" aria-hidden="true">
      <div className="cursor-dot-inner" />
    </div>
  );

  return (
    <main className="contact-page">
      <header className="contact-header">
        {cursorRoot ? null : logoLink}
      </header>

      <section aria-labelledby="contact-heading">
        <div className="contact-section-label">
          <h1 id="contact-heading">Contact</h1>
        </div>
        <div className="contact-divider" />

        <div className="contact-directory">
          {blocks.map((block) => (
            <article className="contact-row" key={`${block.title}-${block.subtitle}`}>
              <div className="contact-row-inner">
                <div className="contact-title-col">
                  <h2>{block.title}</h2>
                  <p>{block.subtitle}</p>
                </div>

                <div className="contact-labels" aria-hidden="true">
                  {block.entries.map((entry, index) => (
                    <span key={`${entry.label}-${index}`}>
                      <ContactIcon name={entry.icon} />
                      {entry.label}
                    </span>
                  ))}
                </div>

                <div className="contact-values">
                  {block.entries.map((entry, index) => (
                    <a
                      key={`${entry.href}-${index}`}
                      href={entry.href}
                      target={entry.href.startsWith('http') ? '_blank' : undefined}
                      rel={entry.href.startsWith('http') ? 'noreferrer' : undefined}
                      data-cursor-hover
                    >
                      <span className="contact-mobile-label">
                        <ContactIcon name={entry.icon} />
                        {entry.label}
                      </span>
                      <span>{entry.value}</span>
                    </a>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="contact-footer">
        HANZOUTI 2026 - All rights reserved
      </footer>

      {cursorRoot ? createPortal(logoLink, cursorRoot) : null}
      {supportsCustomCursor && cursorRoot ? createPortal(cursor, cursorRoot) : null}
    </main>
  );
}
