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

  useEffect(() => {
    if (controlled || !isPlaying || images.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setInternalIndex((current) => (current + 1) % images.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [controlled, images.length, interval, isPlaying]);

  if (!images.length) return null;

  return (
    <div className={`image-sequence${className ? ` ${className}` : ''}`}>
      {images.map((src, index) => (
        <img
          key={src}
          className={`image-sequence-frame${index === currentIndex ? ' is-active' : ''}${
            imageClassName ? ` ${imageClassName}` : ''
          }`}
          src={src}
          alt={index === currentIndex ? alt : ''}
          draggable={false}
          aria-hidden={index === currentIndex ? undefined : 'true'}
        />
      ))}
    </div>
  );
}
