import { useEffect, useMemo, useState } from 'react';
import ContactPage from './components/ContactPage';
import Hero from './components/Hero';
import NavMenu from './components/NavMenu';
import WorkDetail from './components/WorkDetail';
import placeholderWork from './data/placeholderWork';
import './index.css';

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [theme, setTheme] = useState(() => {
    return window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const handlePop = () => setPath(window.location.pathname);
    const handleClick = (event) => {
      const link = event.target.closest('a[href^="/"]');
      if (!link) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target && link.target !== '_self') return;

      event.preventDefault();
      window.history.pushState({}, '', link.href);
      setPath(window.location.pathname);
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePop);
    document.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('popstate', handlePop);
      document.removeEventListener('click', handleClick);
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
    <div className="app" data-theme={theme}>
      {path === '/contact' ? <ContactPage /> : work ? <WorkDetail work={work} /> : <Hero />}
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
      <NavMenu />
    </div>
  );
}

export default App;
