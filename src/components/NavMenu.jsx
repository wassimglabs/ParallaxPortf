import { useState } from 'react';

const LINKS = ['Home', 'Work', 'Editors', 'Shop', 'About', 'Contact'];

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`nav-pill-wrapper ${open ? 'is-open' : ''}`} data-cursor-hover>
      <nav className="nav-links">
        {LINKS.map((link) => (
          <a key={link} href="#" onClick={(e) => e.preventDefault()}>
            {link}
          </a>
        ))}
      </nav>

      <button
        type="button"
        className="menu-toggle"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span />
        <span />
        <span />
      </button>
    </div>
  );
}
