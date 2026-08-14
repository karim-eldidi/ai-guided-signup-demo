/**
 * Line icons, inline as SVG so the pilot needs no icon library and no network.
 * Stroke-based, 1.6px, matching the restrained line style in the designs.
 */

const wrap = (body, size = 22, stroke = 'currentColor', fill = 'none') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  pin: (s) => wrap('<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>', s),
  grid: (s) => wrap('<rect x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"/>', s),
  clock: (s) => wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', s),
  bolt: (s) => wrap('<path d="M13.4 3 6 13.4h4.6L9.9 21l7.6-10.6h-4.7Z"/>', s),
  leaf: (s) => wrap('<path d="M5 19c0-7 5-12 14-12 0 9-5 13-11 13-1.6 0-3-.4-3-1Z"/><path d="M9 15c1.8-2.6 4.2-4.4 7-5.4"/>', s),
  sparkle: (s) => wrap('<path d="M12 3v6M12 15v6M3 12h6M15 12h6M6.2 6.2l3.2 3.2M14.6 14.6l3.2 3.2M17.8 6.2l-3.2 3.2M9.4 14.6l-3.2 3.2"/>', s),
  target: (s) => wrap('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>', s),
  home: (s) => wrap('<path d="M4 11 12 4l8 7"/><path d="M6.5 9.6V20h11V9.6"/>', s),
  calendar: (s) => wrap('<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>', s),
  check: (s) => wrap('<path d="M4.5 12.5 9.5 17.5 19.5 7"/>', s),
  checkThin: (s) => wrap('<path d="M4 12.5 9 17.5 20 6.5"/>', s, 'currentColor'),
  star: (s) => wrap('<path d="M12 3.6l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.7Z" fill="currentColor" stroke="none"/>', s),
  speech: (s) => wrap('<path d="M20 12.4c0 3.9-3.6 7-8 7-1 0-2-.2-2.9-.5L4.5 20.5l1.2-3.6A6.6 6.6 0 0 1 4 12.4c0-3.9 3.6-7 8-7s8 3.1 8 7Z"/>', s),
  chevron: (s) => wrap('<path d="M9 5l7 7-7 7"/>', s),
  chevronDown: (s) => wrap('<path d="M5 9l7 7 7-7"/>', s),
  tag: (s) => wrap('<path d="M12.6 3.5H20v7.4l-9 9-8-8Z"/><circle cx="16.2" cy="7.3" r="1.5"/>', s),
  card: (s) => wrap('<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="M3 10h18"/>', s),
  bank: (s) => wrap('<path d="M4 10 12 4.5 20 10"/><path d="M5.5 10v9h13v-9"/><path d="M4 19.5h16"/>', s),
  lock: (s) => wrap('<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>', s),
  info: (s) => wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 8.2v.1"/>', s),
  refresh: (s) => wrap('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4.5V10h-5.5"/>', s),
  dumbbell: (s) => wrap('<path d="M3.5 9.5v5M6.5 7.5v9M17.5 7.5v9M20.5 9.5v5M6.5 12h11"/>', s),
  glove: (s) => wrap('<path d="M6 10.5V7.8a1.9 1.9 0 0 1 3.8 0v2.7M9.8 10.5V6.5a1.9 1.9 0 0 1 3.8 0v4M13.6 10.8V8.2a1.9 1.9 0 0 1 3.8 0v5.6c0 3.4-2.4 6.2-5.7 6.2s-5.7-2.8-5.7-6.2v-1.5"/>', s),
  waves: (s) => wrap('<path d="M3 8.5c2 0 2.5 1.6 4.5 1.6S10 8.5 12 8.5s2.5 1.6 4.5 1.6S19 8.5 21 8.5"/><path d="M3 13.5c2 0 2.5 1.6 4.5 1.6S10 13.5 12 13.5s2.5 1.6 4.5 1.6S19 13.5 21 13.5"/><path d="M3 18.5c2 0 2.5 1.4 4.5 1.4S10 18.5 12 18.5s2.5 1.4 4.5 1.4S19 18.5 21 18.5"/>', s),
  mountain: (s) => wrap('<path d="M3 19h18L14.2 6.5 11 12l-2-3Z"/><circle cx="17.4" cy="6" r="1.4"/>', s),
  shoe: (s) => wrap('<circle cx="15.5" cy="4.6" r="1.7"/><path d="M13.4 8 9.8 10.2l1.3 3.4-2.6 6.9"/><path d="M11.1 13.6l3.9 1.5 1.5 5.4"/><path d="M13.4 8l4.2 1.4 1.4 3.2"/>', s),
  racket: (s) => wrap('<ellipse cx="14.5" cy="8.8" rx="5.3" ry="6.2" transform="rotate(38 14.5 8.8)"/><path d="M10.2 13.4 4 19.6"/>', s),
  music: (s) => wrap('<circle cx="7" cy="17.5" r="2.6"/><circle cx="17.5" cy="15" r="2.6"/><path d="M9.6 17.5V7l10.5-2.4V15"/>', s),
  spa: (s) => wrap('<path d="M12 20c0-4.5 2.8-8.5 7-10-1 5-3.3 8.4-7 10Z"/><path d="M12 20c0-4.5-2.8-8.5-7-10 1 5 3.3 8.4 7 10Z"/>', s),
  one: (s) => wrap('<path d="M10 8.5 12.5 7v10"/><path d="M10 17h5"/>', s),
  two: (s) => wrap('<path d="M9.5 8.6A2.9 2.9 0 0 1 15 10c0 2.4-5.5 4.4-5.5 7H15"/>', s),
  three: (s) => wrap('<path d="M9.6 8.2a2.8 2.8 0 1 1 2.6 4.3 2.9 2.9 0 1 1-2.7 4.2"/>', s),
  four: (s) => wrap('<path d="M14 6.5 9.2 14.4h6.2"/><path d="M14 11v6.5"/>', s)
};

/** Urby's avatar: two four-point sparkles on a black disc. */
export function ulaAvatar(size = 'md') {
  const cls = size === 'sm' ? 'ula-avatar ula-avatar--sm' : size === 'lg' ? 'ula-avatar ula-avatar--lg' : 'ula-avatar';
  const px = size === 'sm' ? 17 : size === 'lg' ? 30 : 22;
  return `<span class="${cls}" aria-hidden="true">
    <svg width="${px}" height="${px}" viewBox="0 0 24 24" fill="#f6d64a">
      <path d="M9 2.6l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z"/>
      <path d="M16.8 12.4l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1Z"/>
    </svg>
  </span>`;
}

export function icon(name, size = 22) {
  const fn = icons[name] || icons.info;
  return fn(size);
}

export const googleMark = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.4-.2-2H12v3.9h6c-.1 1-.8 2.5-2.2 3.5l3.4 2.6c2-1.9 3.4-4.6 3.4-8Z"/><path fill="#34A853" d="M12 23c2.9 0 5.3-1 7.1-2.6l-3.4-2.6c-.9.6-2.1 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5l-3.5 2.7C4.2 20.5 7.8 23 12 23Z"/><path fill="#FBBC05" d="M5.9 14.3a6.7 6.7 0 0 1 0-4.5L2.4 7.1a11 11 0 0 0 0 9.9Z"/><path fill="#EA4335" d="M12 4.7c1.6 0 3 .6 4.1 1.6l3-3C17.3 1.6 14.9.6 12 .6 7.8.6 4.2 3.1 2.4 6.8l3.5 2.7C6.8 6.9 9.2 4.7 12 4.7Z"/></svg>`;

export const appleMark = `<svg width="20" height="20" viewBox="0 0 24 24" fill="#08090a" aria-hidden="true"><path d="M16.4 12.7c0-2.4 1.9-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.9-1.5-.1-2.8.8-3.5.8-.7 0-1.9-.8-3.1-.8C6.8 7.2 5 8.5 5 11.4c0 1.2.2 2.4.7 3.7 1 2.6 2.4 4.5 3.7 4.5.8 0 1.4-.5 2.4-.5s1.4.5 2.4.5c1.3 0 2.5-1.6 3.4-3.6-1.5-.7-2.2-2-2.2-3.3ZM14.3 5.9c.7-.8 1-1.9.9-2.9-1 .1-2 .6-2.7 1.4-.6.7-1 1.8-.9 2.8 1 .1 2-.4 2.7-1.3Z"/></svg>`;
