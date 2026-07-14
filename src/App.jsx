import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import Hero from './components/Hero';
import NavMenu from './components/NavMenu';
import WorkDetail from './components/WorkDetail';
import WorkIndex from './components/WorkIndex';
import placeholderWork from './data/placeholderWork';
import './index.css';

const PAGE_TRANSITION_MS = 360;

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [pageLeaving, setPageLeaving] = useState(false);
  const appRef = useRef(null);
  const pathRef = useRef(path);
  const transitionTimerRef = useRef(null);
  const transitionFrameRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    return window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  const moveToPath = useCallback((nextPath, nextUrl = nextPath, pushHistory = true) => {
    if (nextPath === pathRef.current) {
      appRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    window.clearTimeout(transitionTimerRef.current);
    window.cancelAnimationFrame(transitionFrameRef.current);
    setPageLeaving(true);

    transitionTimerRef.current = window.setTimeout(() => {
      setPath(nextPath);
      pathRef.current = nextPath;
      if (pushHistory) {
        window.history.pushState({}, '', nextUrl);
      }
      appRef.current?.scrollTo(0, 0);
      window.scrollTo(0, 0);

      transitionFrameRef.current = window.requestAnimationFrame(() => {
        setPageLeaving(false);
      });
    }, PAGE_TRANSITION_MS);
  }, []);

  useEffect(() => {
    const handlePop = () => moveToPath(window.location.pathname, window.location.href, false);
    const handleClick = (event) => {
      const link = event.target.closest('a[href^="/"]');
      if (!link) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target && link.target !== '_self') return;

      const url = new URL(link.href);
      event.preventDefault();
      moveToPath(url.pathname, `${url.pathname}${url.search}${url.hash}`);
    };

    window.addEventListener('popstate', handlePop);
    document.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('popstate', handlePop);
      document.removeEventListener('click', handleClick);
    };
  }, [moveToPath]);

  useEffect(() => {
    return () => {
      window.clearTimeout(transitionTimerRef.current);
      window.cancelAnimationFrame(transitionFrameRef.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const work = useMemo(() => {
    const slug = path.match(/^\/work\/([^/]+)/)?.[1];
    return placeholderWork.find((item) => item.slug === slug);
  }, [path]);

  return (
    <div className="app" data-theme={theme} ref={appRef}>
      <span className={`page-transition-bar${pageLeaving ? ' is-active' : ''}`} aria-hidden="true" />
      <main className={`page-transition${pageLeaving ? ' is-leaving' : ' is-entering'}`}>
        {path === '/contact' ? (
          <ContactPage />
        ) : path === '/about' ? (
          <AboutPage />
        ) : path === '/work' ? (
          <WorkIndex />
        ) : work ? (
          <WorkDetail work={work} />
        ) : (
          <Hero />
        )}
      </main>
      {path === '/' ? (
        <button
          type="button"
          className="theme-toggle"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          data-cursor-hover
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        >
          <span className="theme-toggle-track" aria-hidden="true">
            <span className="theme-toggle-indicator" />
          </span>
        </button>
      ) : null}
      <NavMenu />
    </div>
  );
}

export default App;
