/* Custom engine-part line icons (Lucide style, 2px, round caps/joins)
   + standard UI glyphs. Ported from the redesign handoff icons.js. */

export const ICON_PATHS: Record<string, string> = {
  // engine parts
  piston:
    '<path d="M7 4h10a1 1 0 0 1 1 1v6.5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V5a1 1 0 0 1 1-1z"/>' +
    '<path d="M7 7.3h10M7 9.6h10"/>' +
    '<circle cx="12" cy="12" r="1.5"/>' +
    '<path d="M12 14.5v3.3"/>' +
    '<circle cx="12" cy="19.6" r="1.8"/>',
  ring:
    '<path d="M14.6 4.5A8 8 0 1 1 13 4.07"/>' +
    '<path d="M13 4.07 11 5.2M14.6 4.5l-1.9 1.2"/>',
  bearing:
    '<path d="M3.5 9a8.5 8.5 0 0 0 17 0"/>' +
    '<path d="M7 9a5 5 0 0 0 10 0"/>' +
    '<path d="M11 9h2"/>',
  sleeve:
    '<path d="M6 5v13.2a6 2.4 0 0 0 12 0V5"/>' +
    '<ellipse cx="12" cy="5" rx="6" ry="2.4"/>' +
    '<ellipse cx="12" cy="5" rx="3.1" ry="1.1"/>',
  gasket:
    '<rect x="2.6" y="6" width="18.8" height="12" rx="2.2"/>' +
    '<circle cx="8" cy="12" r="2.4"/>' +
    '<circle cx="14.6" cy="12" r="2.4"/>' +
    '<path d="M5 8.3h0.01M19 8.3h0.01M5 15.7h0.01M19 15.7h0.01M11.3 8.3h0.01M11.3 15.7h0.01" stroke-width="2.4"/>',

  // UI / Lucide
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  wa:
    '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2z"/>' +
    '<path d="M9 8.2c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.5l.7 1.6c.1.3 0 .5-.1.7l-.5.6c-.1.2-.2.4 0 .6a6 6 0 0 0 2.6 2.3c.3.1.5.1.7-.1l.5-.7c.2-.2.4-.2.6-.2l1.6.7c.3.2.4.4.4.6s0 1-.4 1.5c-.4.4-1.2.9-1.8.9a7 7 0 0 1-6.4-6.4c0-.5.3-1.1.6-1.4z"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevR: '<path d="m9 6 6 6-6 6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  copy:
    '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  truck:
    '<path d="M14 18V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h1"/><path d="M14 9h4l3 3v5a1 1 0 0 1-1 1h-1"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  box: '<path d="m21 8-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h16a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M18 12h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  sort: '<path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 4v16"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.3 5.3L3 18l3 3 6.4-6.4a4 4 0 0 0 5.3-5.3l-2.6 2.6-2-2 2.6-2.6z"/>',
};

export type IconName = keyof typeof ICON_PATHS;

export function Icon({
  name,
  size = 24,
  stroke = 2,
  className,
}: {
  name: IconName | string;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const inner = ICON_PATHS[name];
  if (!inner) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
