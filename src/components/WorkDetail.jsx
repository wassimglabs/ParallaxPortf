import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ImageSequence from './ImageSequence';
import semsemLogo from '../assets/y444 (1).svg';
import useDeviceCapabilities from '../hooks/useDeviceCapabilities';

const HOVER_SELECTOR = 'a, button, [role="button"], [data-cursor-hover]';
const SPRING = { stiffness: 30, damping: 11 };
const CURSOR_SPRING = { stiffness: 480, damping: 42 };
const OVERLAY_REMOVE_DELAY_MS = 2000;
const OVERLAY_FADE_DURATION_MS = 700;
const OVERLAY_FADE_START_DELAY_MS = OVERLAY_REMOVE_DELAY_MS - OVERLAY_FADE_DURATION_MS;

function stepSpring(pos, vel, target, stiffness, damping, dt) {
  const accel = (target - pos) * stiffness - vel * damping;
  const nextVel = vel + accel * dt;
  const nextPos = pos + nextVel * dt;
  return [nextPos, nextVel];
}

function shapeInput(value) {
  return Math.tanh(value * 1.25) / Math.tanh(1.25);
}

function getCreditValue(credits, label) {
  return credits.find(([role]) => role.toLowerCase() === label.toLowerCase())?.[1];
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00.00';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}.${String(remaining).padStart(2, '0')}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function WorkDetail({ work }) {
  const pageRef = useRef(null);
  const playerRef = useRef(null);
  const videoRef = useRef(null);
  const logoRef = useRef(null);
  const dotRef = useRef(null);
  const { prefersReducedMotion, supportsCustomCursor } = useDeviceCapabilities();
  const [cursorRoot, setCursorRoot] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isOverlayActive, setIsOverlayActive] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [sequencePlaying, setSequencePlaying] = useState(true);
  const seekingRef = useRef(false);
  const idleTimer = useRef(null);
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
  const sequenceFrames = work.images || [];
  const isImageSequence = sequenceFrames.length > 0;

  useEffect(() => {
    setCursorRoot(document.body);
  }, []);

  useEffect(() => {
    setSequenceIndex(0);
    setSequencePlaying(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [work.id]);

  useEffect(() => {
    if (!isImageSequence || !sequencePlaying || isSeeking || sequenceFrames.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSequenceIndex((current) => (current + 1) % sequenceFrames.length);
    }, 760);

    return () => window.clearInterval(timer);
  }, [isImageSequence, isSeeking, sequenceFrames.length, sequencePlaying]);

  useEffect(() => {
    const scrollRoot = pageRef.current?.closest('.app') || window;

    const showOverlay = () => {
      setIsOverlayActive(true);
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        setIsOverlayActive(false);
      }, OVERLAY_FADE_START_DELAY_MS);
    };

    showOverlay();

    window.addEventListener('mousemove', showOverlay, { passive: true });
    window.addEventListener('pointerdown', showOverlay, { passive: true });
    window.addEventListener('touchmove', showOverlay, { passive: true });
    window.addEventListener('wheel', showOverlay, { passive: true });
    window.addEventListener('keydown', showOverlay);
    scrollRoot.addEventListener('scroll', showOverlay, { passive: true });

    return () => {
      window.clearTimeout(idleTimer.current);
      window.removeEventListener('mousemove', showOverlay);
      window.removeEventListener('pointerdown', showOverlay);
      window.removeEventListener('touchmove', showOverlay);
      window.removeEventListener('wheel', showOverlay);
      window.removeEventListener('keydown', showOverlay);
      scrollRoot.removeEventListener('scroll', showOverlay);
    };
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

      const scrollRoot = pageRef.current?.closest('.app');
      const maxScroll = scrollRoot ? scrollRoot.scrollHeight - scrollRoot.clientHeight : 0;
      const scrollProgress = maxScroll > 0 ? scrollRoot.scrollTop / maxScroll : 0;
      const seconds = time / 1000;
      const nx = supportsCustomCursor
        ? shapeInput(pointer.current.x) * 0.18 + Math.sin(seconds * 0.32 + scrollProgress * 5.8) * 0.42
        : Math.sin(seconds * 0.32 + scrollProgress * 5.8) * 0.42;
      const ny = supportsCustomCursor
        ? shapeInput(pointer.current.y) * 0.12 + Math.cos(seconds * 0.28 + scrollProgress * 4.6) * 0.32
        : Math.cos(seconds * 0.28 + scrollProgress * 4.6) * 0.32;

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

  const progress = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;
  const currentTimeLabel = formatTime(currentTime);
  const mediaIsPlaying = isImageSequence ? sequencePlaying : isPlaying;

  const syncTime = () => {
    if (isImageSequence) return;
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const syncDuration = () => {
    if (isImageSequence) return;
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
    setCurrentTime(videoRef.current.currentTime || 0);
  };

  const seekToClientX = (clientX) => {
    if (!playerRef.current || isImageSequence) return;
    const rect = playerRef.current.getBoundingClientRect();
    const percent = clamp((clientX - rect.left) / rect.width, 0, 1);

    if (!videoRef.current || !duration) return;
    videoRef.current.currentTime = percent * duration;
    setCurrentTime(videoRef.current.currentTime);
  };

  const togglePlay = () => {
    if (isImageSequence) {
      setSequencePlaying((current) => !current);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      return;
    }

    video.pause();
  };

  const handlePointerDown = (event) => {
    if (isImageSequence) return;
    if (event.target.closest('[data-player-action]')) return;
    seekingRef.current = true;
    setIsSeeking(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    seekToClientX(event.clientX);
  };

  const handlePointerMove = (event) => {
    if (!seekingRef.current) return;
    seekToClientX(event.clientX);
  };

  const endSeek = (event) => {
    seekingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsSeeking(false);
  };

  const credits = work.credits || [];
  const productionCompany = work.productionCompany || getCreditValue(credits, 'Production Company');
  const creditRows = [
    productionCompany ? ['Production Company', productionCompany] : null,
    ['Position', work.position || work.type],
  ].filter(Boolean);

  const logoLink = (
    <a
      href="/"
      className={`work-logo${isOverlayActive ? '' : ' is-idle'}`}
      aria-label="Back to home"
      data-cursor-hover
    >
      <span
        ref={logoRef}
        className="work-logo-mark"
        style={{ '--work-logo-url': `url("${semsemLogo}")` }}
        aria-hidden="true"
      />
    </a>
  );

  const cursor = (
    <div ref={dotRef} className="cursor-dot" aria-hidden="true">
      <div className="cursor-dot-inner" />
    </div>
  );

  return (
    <main ref={pageRef} className={`work-page${isOverlayActive ? '' : ' is-idle'}`}>
      {cursorRoot ? null : logoLink}

      <section className="work-hero">
        <div
          ref={playerRef}
          className={`work-player${mediaIsPlaying ? ' is-playing' : ''}${isSeeking ? ' is-seeking' : ''}${
            isImageSequence ? ' is-image-sequence' : ''
          }`}
          style={{ '--work-progress': `${progress}%` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endSeek}
          onPointerCancel={endSeek}
        >
          {isImageSequence ? (
            <div className="work-sequence-card">
              <ImageSequence
                images={sequenceFrames}
                alt={`${work.client} ${work.title}`}
                activeIndex={sequenceIndex}
                isPlaying={false}
                className="work-sequence-media"
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              className="work-video"
              src={work.video}
              poster={work.poster}
              crossOrigin="anonymous"
              muted={isMuted}
              preload="metadata"
              playsInline
              onLoadedMetadata={syncDuration}
              onTimeUpdate={syncTime}
              onPlay={() => {
                setIsPlaying(true);
              }}
              onPause={() => {
                setIsPlaying(false);
              }}
              onEnded={() => {
                setIsPlaying(false);
              }}
            />
          )}

          {isImageSequence ? null : (
            <>
              <button
                type="button"
                className="work-player-play"
                aria-label={mediaIsPlaying ? 'Pause media' : 'Play media'}
                data-player-action
                data-cursor-hover
                onClick={togglePlay}
              >
                <span aria-hidden="true" />
              </button>

              <div className="work-player-seek" aria-hidden="true">
                <span className="work-player-time">{currentTimeLabel}</span>
                <span className="work-player-handle">
                  <span />
                </span>
              </div>
            </>
          )}

          <div className="work-player-actions">
            {isImageSequence ? null : (
              <button
                type="button"
                className={`work-player-dot-button${isMuted ? ' is-muted' : ''}`}
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                data-player-action
                data-cursor-hover
                onClick={() => {
                  const nextMuted = !isMuted;
                  if (videoRef.current) {
                    videoRef.current.muted = nextMuted;
                  }
                  setIsMuted(nextMuted);
                }}
              >
                <span aria-hidden="true" />
                <span aria-hidden="true" />
                <span aria-hidden="true" />
              </button>
            )}

            <a
              className="work-player-close"
              href="/"
              aria-label="Back to home"
              data-player-action
              data-cursor-hover
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </a>
          </div>

          <div className="work-player-meta" aria-hidden="true">
            <span>{work.client}</span>
            <span>{work.title}</span>
            <span>{work.editor}</span>
          </div>
        </div>

      </section>

      {work.description ? (
        <section className="work-description" aria-label="Description">
          <h2>Description</h2>
          <p>{work.description}</p>
        </section>
      ) : null}

      <section className="work-credits" aria-label="Credits">
        <h2>Credits</h2>
        <div className="work-credit-list">
          {creditRows.map(([role, name]) => (
            <div className="work-credit-row" key={role}>
              <span>{role}</span>
              <strong>{name}</strong>
            </div>
          ))}
        </div>
      </section>

      {cursorRoot ? createPortal(logoLink, cursorRoot) : null}
      {supportsCustomCursor && cursorRoot ? createPortal(cursor, cursorRoot) : null}
    </main>
  );
}
