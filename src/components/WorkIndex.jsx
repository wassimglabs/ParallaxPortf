import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import placeholderWork from '../data/placeholderWork';
import ImageSequence from './ImageSequence';
import useDeviceCapabilities from '../hooks/useDeviceCapabilities';

const HOVER_SELECTOR = 'a, button, [role="button"], .work-index-row, [data-cursor-hover]';
const PREVIEW_MARGIN = 20;
const PREVIEW_OFFSET_X = 32;
const PREVIEW_OFFSET_Y = 24;
const SPRING = { stiffness: 46, damping: 14 };
const CURSOR_SPRING = { stiffness: 500, damping: 45 };
const FILTER_META = {
  client: { label: 'Client', optionsKey: 'clients' },
  title: { label: 'Project', optionsKey: 'projects' },
  type: { label: 'Type', optionsKey: 'types' },
};

function stepSpring(pos, vel, target, stiffness, damping, dt) {
  const accel = (target - pos) * stiffness - vel * damping;
  const nextVel = vel + accel * dt;
  const nextPos = pos + nextVel * dt;
  return [nextPos, nextVel];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getUniqueOptions(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))];
}

function getPreviewSize(previewElement) {
  const rect = previewElement?.getBoundingClientRect();
  return {
    width: rect?.width || Math.min(Math.max(window.innerWidth * 0.28, 250), 430),
    height: rect?.height || Math.min(Math.max(window.innerWidth * 0.28, 250), 430) * 0.62,
  };
}

export default function WorkIndex() {
  const [cursorRoot, setCursorRoot] = useState(null);
  const { supportsHoverEffects, supportsCustomCursor } = useDeviceCapabilities();
  const [activeId, setActiveId] = useState(placeholderWork[0]?.id ?? null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [hoveringList, setHoveringList] = useState(false);
  const [filters, setFilters] = useState({
    client: '',
    title: '',
    type: '',
  });
  const [activeFilter, setActiveFilter] = useState(null);
  const [filterModalPosition, setFilterModalPosition] = useState({ left: 14, top: 132, width: 220 });
  const previewRef = useRef(null);
  const videoRef = useRef(null);
  const dotRef = useRef(null);
  const rafId = useRef(null);
  const lastTime = useRef(null);
  const reduceMotion = useRef(false);
  const previewTarget = useRef({ x: 0, y: 0 });
  const previewMotion = useRef({ x: 0, xVel: 0, y: 0, yVel: 0 });
  const cursorTarget = useRef({ x: 0, y: 0 });
  const cursorMotion = useRef({ x: 0, xVel: 0, y: 0, yVel: 0 });

  const activeWork = useMemo(() => {
    return placeholderWork.find((item) => item.id === activeId) || placeholderWork[0];
  }, [activeId]);

  const filterOptions = useMemo(() => {
    return {
      clients: getUniqueOptions(placeholderWork, 'client'),
      projects: getUniqueOptions(placeholderWork, 'title'),
      types: getUniqueOptions(placeholderWork, 'type'),
    };
  }, []);

  const filteredWork = useMemo(() => {
    return placeholderWork.filter((item) => {
      return (
        (!filters.client || item.client === filters.client) &&
        (!filters.title || item.title === filters.title) &&
        (!filters.type || item.type === filters.type)
      );
    });
  }, [filters]);

  const closeFilterModal = () => {
    setActiveFilter(null);
  };

  const openFilterModal = (key, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const modalWidth = Math.min(Math.max(rect.width + 56, 202), 320);
    setPreviewVisible(false);
    setHoveringList(false);
    setActiveFilter(key);
    setFilterModalPosition({
      left: clamp(rect.left, 10, Math.max(10, window.innerWidth - modalWidth - 10)),
      top: rect.bottom + 8,
      width: modalWidth,
    });
  };

  const updateFilter = (key, value) => {
    setPreviewVisible(false);
    setHoveringList(false);
    setFilters((current) => ({ ...current, [key]: value }));
    closeFilterModal();
  };

  useEffect(() => {
    if (!activeFilter) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeFilterModal();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFilter]);

  useEffect(() => {
    setCursorRoot(document.body);
    previewTarget.current = {
      x: window.innerWidth * 0.58,
      y: window.innerHeight * 0.34,
    };
    previewMotion.current.x = previewTarget.current.x;
    previewMotion.current.y = previewTarget.current.y;
    cursorTarget.current = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    cursorMotion.current.x = cursorTarget.current.x;
    cursorMotion.current.y = cursorTarget.current.y;
  }, []);

  useEffect(() => {
    if (!previewVisible || activeWork.images?.length || !videoRef.current) return;
    videoRef.current.play().catch(() => {});
  }, [activeId, activeWork.images?.length, previewVisible]);

  useEffect(() => {
    if (!supportsHoverEffects && !supportsCustomCursor) {
      return undefined;
    }

    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    lastTime.current = null;

    const handlePointerMove = (event) => {
      cursorTarget.current.x = event.clientX;
      cursorTarget.current.y = event.clientY;
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

    const tick = (time) => {
      if (lastTime.current === null) lastTime.current = time;
      const dt = Math.min((time - lastTime.current) / 1000, 1 / 30);
      lastTime.current = time;

      if (reduceMotion.current) {
        previewMotion.current.x = previewTarget.current.x;
        previewMotion.current.y = previewTarget.current.y;
        cursorMotion.current.x = cursorTarget.current.x;
        cursorMotion.current.y = cursorTarget.current.y;
      } else {
        [previewMotion.current.x, previewMotion.current.xVel] = stepSpring(
          previewMotion.current.x,
          previewMotion.current.xVel,
          previewTarget.current.x,
          SPRING.stiffness,
          SPRING.damping,
          dt,
        );
        [previewMotion.current.y, previewMotion.current.yVel] = stepSpring(
          previewMotion.current.y,
          previewMotion.current.yVel,
          previewTarget.current.y,
          SPRING.stiffness,
          SPRING.damping,
          dt,
        );
        [cursorMotion.current.x, cursorMotion.current.xVel] = stepSpring(
          cursorMotion.current.x,
          cursorMotion.current.xVel,
          cursorTarget.current.x,
          CURSOR_SPRING.stiffness,
          CURSOR_SPRING.damping,
          dt,
        );
        [cursorMotion.current.y, cursorMotion.current.yVel] = stepSpring(
          cursorMotion.current.y,
          cursorMotion.current.yVel,
          cursorTarget.current.y,
          CURSOR_SPRING.stiffness,
          CURSOR_SPRING.damping,
          dt,
        );
      }

      if (previewRef.current) {
        previewRef.current.style.transform = `translate3d(${previewMotion.current.x}px, ${previewMotion.current.y}px, 0)`;
      }

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${cursorMotion.current.x - 7}px, ${cursorMotion.current.y - 7}px)`;
      }

      rafId.current = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', handlePointerMove);
    if (supportsCustomCursor) {
      window.addEventListener('mouseover', handleOver);
      window.addEventListener('mouseout', handleOut);
      window.addEventListener('pointerdown', handlePointerDown);
    }
    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mouseover', handleOver);
      window.removeEventListener('mouseout', handleOut);
      window.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(rafId.current);
    };
  }, [supportsCustomCursor, supportsHoverEffects]);

  const movePreviewFromPointer = (event) => {
    const { width, height } = getPreviewSize(previewRef.current);
    let x = event.clientX + PREVIEW_OFFSET_X;
    let y = event.clientY + PREVIEW_OFFSET_Y;

    if (x + width > window.innerWidth - PREVIEW_MARGIN) {
      x = event.clientX - width - PREVIEW_OFFSET_X;
    }

    if (y + height > window.innerHeight - PREVIEW_MARGIN) {
      y = event.clientY - height - PREVIEW_OFFSET_Y;
    }

    previewTarget.current = {
      x: clamp(x, PREVIEW_MARGIN, Math.max(PREVIEW_MARGIN, window.innerWidth - width - PREVIEW_MARGIN)),
      y: clamp(y, PREVIEW_MARGIN, Math.max(PREVIEW_MARGIN, window.innerHeight - height - PREVIEW_MARGIN)),
    };
  };

  const movePreviewFromElement = (element) => {
    const rect = element.getBoundingClientRect();
    const { width, height } = getPreviewSize(previewRef.current);
    const x = rect.left + rect.width * 0.58;
    const y = rect.top + rect.height * 0.5 - height * 0.5;

    previewTarget.current = {
      x: clamp(x, PREVIEW_MARGIN, Math.max(PREVIEW_MARGIN, window.innerWidth - width - PREVIEW_MARGIN)),
      y: clamp(y, PREVIEW_MARGIN, Math.max(PREVIEW_MARGIN, window.innerHeight - height - PREVIEW_MARGIN)),
    };
  };

  const showPreview = (item, event) => {
    if (!supportsHoverEffects) return;
    setActiveId(item.id);
    setPreviewVisible(true);
    setHoveringList(true);
    movePreviewFromPointer(event);
  };

  const showPreviewFromFocus = (item, event) => {
    if (!supportsHoverEffects) return;
    setActiveId(item.id);
    setPreviewVisible(true);
    setHoveringList(true);
    movePreviewFromElement(event.currentTarget);
  };

  const hidePreview = () => {
    setPreviewVisible(false);
    setHoveringList(false);
  };

  const preview = (
    <aside
      ref={previewRef}
      className={`work-hover-preview${previewVisible ? ' is-visible' : ''}`}
      aria-hidden="true"
    >
      <div className="work-hover-preview-inner">
        {activeWork.images?.length ? (
          <ImageSequence
            key={activeWork.id}
            images={activeWork.images}
            alt={`${activeWork.client} ${activeWork.title}`}
            isPlaying={previewVisible}
            className="work-hover-sequence"
          />
        ) : (
          <video
            key={activeWork.id}
            ref={videoRef}
            className="work-hover-video"
            src={previewVisible ? activeWork.video : undefined}
            poster={activeWork.poster}
            muted
            autoPlay={previewVisible}
            loop
            playsInline
            preload={previewVisible ? 'metadata' : 'none'}
            draggable={false}
          />
        )}
      </div>
    </aside>
  );

  const cursor = (
    <div ref={dotRef} className="cursor-dot" aria-hidden="true">
      <div className="cursor-dot-inner" />
    </div>
  );

  const filterModal = activeFilter ? (
    <>
      <button
        type="button"
        className="work-filter-backdrop"
        aria-label="Close filter"
        onClick={closeFilterModal}
      />
      <div
        className="work-filter-popover"
        role="dialog"
        aria-label={`Filter by ${FILTER_META[activeFilter].label.toLowerCase()}`}
        style={{
          left: `${filterModalPosition.left}px`,
          top: `${filterModalPosition.top}px`,
          width: `${filterModalPosition.width}px`,
        }}
      >
        {['', ...filterOptions[FILTER_META[activeFilter].optionsKey]].map((option) => {
          const label = option || 'All';
          const selected = filters[activeFilter] === option;

          return (
            <button
              key={option || 'all'}
              type="button"
              className={`work-filter-option${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => updateFilter(activeFilter, option)}
            >
              <span className="work-filter-radio" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </>
  ) : null;

  return (
    <section className="work-index-page" aria-labelledby="work-index-title">
      <header className="work-index-header">
        <h1 id="work-index-title">Work</h1>
      </header>

      <div
        className={`work-index-table${hoveringList ? ' is-hovering' : ''}`}
        role="list"
        onPointerLeave={hidePreview}
      >
        <div className="work-index-head">
          {Object.entries(FILTER_META).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              className={`work-filter-button${activeFilter === key ? ' is-open' : ''}${filters[key] ? ' has-filter' : ''}`}
              aria-haspopup="dialog"
              aria-expanded={activeFilter === key}
              aria-label={`Filter by ${meta.label.toLowerCase()}`}
              onClick={(event) => openFilterModal(key, event)}
              title={filters[key] || meta.label}
              data-cursor-hover
            >
              {meta.label}
            </button>
          ))}
        </div>

        {filteredWork.map((item) => (
          <a
            key={item.id}
            className={`work-index-row${activeId === item.id && previewVisible ? ' is-active' : ''}`}
            href={`/work/${item.slug}`}
            role="listitem"
            onPointerEnter={(event) => showPreview(item, event)}
            onPointerMove={movePreviewFromPointer}
            onFocus={(event) => showPreviewFromFocus(item, event)}
            onBlur={hidePreview}
          >
            <span className="work-row-client">{item.client}</span>
            <span className="work-row-title">{item.title}</span>
            <span className="work-row-type">{item.type}</span>
          </a>
        ))}
      </div>

      {cursorRoot ? createPortal(preview, cursorRoot) : preview}
      {cursorRoot ? createPortal(filterModal, cursorRoot) : filterModal}
      {supportsCustomCursor && cursorRoot ? createPortal(cursor, cursorRoot) : null}
    </section>
  );
}
