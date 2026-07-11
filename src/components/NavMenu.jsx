import { useState } from 'react';

const LINKS = ['Home', 'Work', 'Editors', 'Shop', 'About', 'Contact'];

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`menu-btn${open ? ' is-open' : ''}`}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`nav-overlay${open ? ' open' : ''}`}>
        <nav>
          {LINKS.map((link) => (
            <a key={link} href="#" onClick={(e) => e.preventDefault()}>
              {link}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}