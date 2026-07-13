import { useEffect, useRef, useState } from 'react';

const ENTER_BASE_DELAY = 40; // ms stagger step between cards
const ENTER_JITTER = 220; // ms of pseudo-random spread so it isn't metronomic

export default function PhotoCard({ client, title, video, width, layout, index = 0, href }) {
  const videoRef = useRef(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setEntered(true);
      return;
    }
    // stable per-card jitter (not Math.random) so it's consistent across re-renders
    const jitter = (index * 137) % ENTER_JITTER;
    const delay = index * ENTER_BASE_DELAY + jitter;
    const t = setTimeout(() => setEntered(true), delay);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(() => {
    // don't call .play() until the card has entered — kicking off 14 video
    // decodes on mount at once is what makes hero sections stutter/jank
    if (entered && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [entered]);

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
        marginTop: '-112px',
      }}
      aria-label={`${client} ${title}`}
    >
      <div className="photo-card-surface">
        <video
          ref={videoRef}
          className="photo-card-video"
          src={video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          draggable={false}
        />
        <div className="photo-tag">
          <span className="photo-tag-client">{client}</span>
          <span className="photo-tag-title">{title}</span>
        </div>
      </div>
    </a>
  );
}
