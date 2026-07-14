import { useEffect, useRef, useState } from 'react';
import ImageSequence from './ImageSequence';

const ENTER_BASE_DELAY = 40; // ms stagger step between cards
const ENTER_JITTER = 220; // ms of pseudo-random spread so it isn't metronomic
const VIDEO_IDLE_DELAY = 900;
const VIDEO_STAGGER_DELAY = 260;

export default function PhotoCard({ client, title, video, poster, images = [], width, layout, index = 0, href }) {
  const videoRef = useRef(null);
  const loadTimerRef = useRef(null);
  const [entered, setEntered] = useState(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const hasImageSequence = images.length > 0;
  const verticalOffset = width * 0.54;

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setEntered(true);
      return undefined;
    }

    // stable per-card jitter (not Math.random) so it's consistent across re-renders
    const jitter = (index * 137) % ENTER_JITTER;
    const delay = index * ENTER_BASE_DELAY + jitter;
    const timerId = window.setTimeout(() => setEntered(true), delay);
    return () => window.clearTimeout(timerId);
  }, [index]);

  useEffect(() => {
    if (hasImageSequence || !entered) return undefined;

    const scheduleIdle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 1));
    const cancelIdle = window.cancelIdleCallback || window.clearTimeout;
    const idleId = scheduleIdle(() => {
      loadTimerRef.current = window.setTimeout(() => {
        setLoadVideo(true);
      }, VIDEO_IDLE_DELAY + index * VIDEO_STAGGER_DELAY);
    });

    return () => {
      cancelIdle(idleId);
      window.clearTimeout(loadTimerRef.current);
    };
  }, [entered, hasImageSequence, index]);

  useEffect(() => {
    if (!hasImageSequence && entered && loadVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [entered, hasImageSequence, loadVideo]);

  const warmVideo = () => {
    if (!hasImageSequence) {
      setLoadVideo(true);
    }
  };

  return (
    <a
      className={`photo-card${entered ? ' is-entered' : ''}`}
      href={href}
      style={{
        left: layout.x,
        top: layout.y,
        width,
        '--tilt': `${layout.rotate}deg`,
        '--depth-z': `${layout.z}px`,
        '--stack-z': layout.stack,
        marginLeft: `-${width / 2}px`,
        marginTop: `-${verticalOffset}px`,
      }}
      aria-label={`${client} ${title}`}
      onPointerEnter={warmVideo}
      onFocus={warmVideo}
    >
      <div className="photo-card-surface">
        {hasImageSequence ? (
          <ImageSequence
            images={images}
            alt={`${client} ${title}`}
            isPlaying={entered}
            className="photo-card-media photo-card-sequence"
          />
        ) : (
          <video
            ref={videoRef}
            className="photo-card-video photo-card-media"
            src={loadVideo ? video : undefined}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload={loadVideo ? 'metadata' : 'none'}
            draggable={false}
          />
        )}
        <div className="photo-tag">
          <span className="photo-tag-client">{client}</span>
          <span className="photo-tag-title">{title}</span>
        </div>
      </div>
    </a>
  );
}
