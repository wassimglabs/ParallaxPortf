import { useState } from 'react';

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Work', href: '/' },
  { label: 'About', href: '/' },
  { label: 'Contact', href: '/contact' },
];

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="nav-modal-backdrop fixed inset-0 z-30 cursor-none border-0 p-0"
        />
      ) : null}

      <div
        data-cursor-hover
        className={`fixed bottom-6 left-1/2 z-40 flex h-7 -translate-x-1/2 items-center justify-end overflow-hidden whitespace-nowrap rounded-full bg-[var(--nav-bg)] p-[3px] shadow-[0_12px_32px_rgba(0,0,0,0.18)] will-change-[width,transform] [transition:width_680ms_cubic-bezier(0.22,1,0.36,1),background-color_420ms_ease,box-shadow_420ms_ease] ${
          open ? 'w-[min(332px,calc(100vw-48px))]' : 'w-7'
        }`}
      >
        <nav
          className={`flex min-w-0 flex-1 items-center justify-between gap-3 pl-4 pr-3 [transition:opacity_320ms_ease,transform_520ms_cubic-bezier(0.22,1,0.36,1)] ${
            open
              ? 'pointer-events-auto translate-x-0 opacity-100 delay-[180ms]'
              : 'pointer-events-none translate-x-2.5 opacity-0'
          }`}
        >
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="nav-link cursor-none py-1 font-sans text-sm font-medium capitalize text-[var(--nav-fg)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="m-0 flex h-[22px] w-[22px] flex-shrink-0 cursor-none flex-col items-center justify-center gap-1 rounded-full border-0 bg-transparent p-0 transition-transform duration-300 ease-out hover:scale-105 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[var(--nav-fg)]"
        >
          <span
            className={`block h-[1.5px] w-[10px] rounded-full bg-[var(--nav-fg)] [transition:transform_520ms_cubic-bezier(0.22,1,0.36,1),opacity_260ms_ease,width_420ms_cubic-bezier(0.22,1,0.36,1),background-color_420ms_ease] ${
              open ? 'translate-y-[5.5px] rotate-45' : ''
            }`}
          />
          <span
            className={`block h-[1.5px] w-[10px] rounded-full bg-[var(--nav-fg)] [transition:transform_320ms_ease,opacity_220ms_ease,background-color_420ms_ease] ${
              open ? 'scale-x-0 opacity-0' : 'scale-x-100 opacity-100'
            }`}
          />
          <span
            className={`block h-[1.5px] rounded-full bg-[var(--nav-fg)] [transition:transform_520ms_cubic-bezier(0.22,1,0.36,1),opacity_260ms_ease,width_420ms_cubic-bezier(0.22,1,0.36,1),background-color_420ms_ease] ${
              open ? 'w-[10px] -translate-y-[5.5px] -rotate-45' : 'w-[6px]'
            }`}
          />
        </button>
      </div>
    </>
  );
}
