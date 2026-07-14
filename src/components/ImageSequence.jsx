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
  const [loadedFrames, setLoadedFrames] = useState(() => new Set());
  const [visibleIndex, setVisibleIndex] = useState(0);
  const controlled = Number.isInteger(activeIndex);
  const currentIndex = controlled ? activeIndex : internalIndex;
  const currentSrc = images[currentIndex % images.length];
  const allFramesLoaded = loadedFrames.size >= images.length;

  useEffect(() => {
    setInternalIndex(0);
    setVisibleIndex(0);
    setLoadedFrames(new Set());
  }, [images]);

  useEffect(() => {
    images.forEach((src) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        setLoadedFrames((current) => {
          if (current.has(src)) return current;
          const next = new Set(current);
          next.add(src);
          return next;
        });
      };
      image.src = src;
    });
  }, [images]);

  useEffect(() => {
    if (!currentSrc || !loadedFrames.has(currentSrc)) return;
    setVisibleIndex(currentIndex % images.length);
  }, [currentIndex, currentSrc, images.length, loadedFrames]);

  useEffect(() => {
    if (controlled || !isPlaying || images.length < 2 || !allFramesLoaded) return undefined;

    const timer = window.setInterval(() => {
      setInternalIndex((current) => (current + 1) % images.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [allFramesLoaded, controlled, images.length, interval, isPlaying]);

  if (!images.length) return null;

  return (
    <div className={`image-sequence${className ? ` ${className}` : ''}`}>
      {images.map((src, index) => (
        <img
          key={src}
          className={`image-sequence-frame${index === visibleIndex ? ' is-active' : ''}${
            imageClassName ? ` ${imageClassName}` : ''
          }`}
          src={src}
          alt={index === visibleIndex ? alt : ''}
          draggable={false}
          decoding="async"
          loading="eager"
          fetchPriority={index === 0 ? 'high' : 'low'}
          aria-hidden={index === visibleIndex ? undefined : 'true'}
          onLoad={() => {
            setLoadedFrames((current) => {
              if (current.has(src)) return current;
              const next = new Set(current);
              next.add(src);
              return next;
            });
          }}
        />
      ))}
    </div>
  );
}
