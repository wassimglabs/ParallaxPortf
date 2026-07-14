import { useEffect, useState } from 'react';

export default function ImageSequence({
  images,
  alt,
  activeIndex,
  isPlaying = true,
  interval = 620,
  className = '',
  imageClassName = '',
}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const controlled = Number.isInteger(activeIndex);
  const currentIndex = controlled ? activeIndex : internalIndex;
  const currentSrc = images[currentIndex % images.length];
  const nextSrc = images[(currentIndex + 1) % images.length];

  useEffect(() => {
    if (controlled || !isPlaying || images.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setInternalIndex((current) => (current + 1) % images.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [controlled, images.length, interval, isPlaying]);

  useEffect(() => {
    if (!nextSrc) return undefined;

    const image = new Image();
    image.decoding = 'async';
    image.src = nextSrc;

    return undefined;
  }, [nextSrc]);

  if (!images.length) return null;

  return (
    <div className={`image-sequence${className ? ` ${className}` : ''}`}>
      <img
        key={currentSrc}
        className={`image-sequence-frame is-active${imageClassName ? ` ${imageClassName}` : ''}`}
        src={currentSrc}
        alt={alt}
        draggable={false}
        decoding="async"
        fetchPriority={currentIndex === 0 ? 'high' : 'low'}
      />
    </div>
  );
}
