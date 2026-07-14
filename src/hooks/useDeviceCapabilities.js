import { useEffect, useState } from 'react';

const CUSTOM_CURSOR_MIN_WIDTH = 900;
const CUSTOM_CURSOR_MAX_WIDTH = 1799;

function getCapabilities() {
  if (typeof window === 'undefined') {
    return {
      prefersReducedMotion: false,
      supportsHoverEffects: false,
      supportsCustomCursor: false,
    };
  }

  const supportsFineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const width = window.innerWidth;

  return {
    prefersReducedMotion,
    supportsHoverEffects: supportsFineHover,
    supportsCustomCursor:
      supportsFineHover &&
      !prefersReducedMotion &&
      width >= CUSTOM_CURSOR_MIN_WIDTH &&
      width <= CUSTOM_CURSOR_MAX_WIDTH,
  };
}

export default function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState(getCapabilities);

  useEffect(() => {
    const syncCapabilities = () => {
      setCapabilities(getCapabilities());
    };

    const mediaQueries = [
      window.matchMedia('(hover: hover) and (pointer: fine)'),
      window.matchMedia('(prefers-reduced-motion: reduce)'),
    ];

    window.addEventListener('resize', syncCapabilities, { passive: true });
    mediaQueries.forEach((query) => query.addEventListener('change', syncCapabilities));

    return () => {
      window.removeEventListener('resize', syncCapabilities);
      mediaQueries.forEach((query) => query.removeEventListener('change', syncCapabilities));
    };
  }, []);

  return capabilities;
}
