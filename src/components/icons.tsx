import React from 'react'

/** Interface icons. 24px viewBox, 1.5px stroke, round caps, no fill. */
const ICONS: Record<string, React.ReactNode> = {
  journal: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="15" y2="7"/><line x1="8" y1="11" x2="15" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></>,
  items: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>,
  map: <><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></>,
  people: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  rest: <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>,
  menu: <><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></>,
}

export function Icon({ name, className }: { name: keyof typeof ICONS | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  )
}

/** Six day-part glyphs (U9): low sun, sun, high sun, slanting sun, sun on the horizon, moon. */
const PARTS: Record<string, React.ReactNode> = {
  dawn: <><path d="M3 18h18"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M12 9v2M5.6 11.6l1.4 1.4M18.4 11.6 17 13"/></>,
  morning: <><circle cx="12" cy="13" r="4"/><path d="M12 5v2M5 13H3M21 13h-2M6.3 7.3l1.4 1.4M17.7 7.3l-1.4 1.4"/><path d="M3 20h18"/></>,
  midday: <><circle cx="12" cy="9" r="4"/><path d="M12 2v1.5M12 14.5V16M5 9H3.5M20.5 9H19M7 4l1 1M17 4l-1 1"/><path d="M3 20h18"/></>,
  afternoon: <><circle cx="15" cy="10" r="4"/><path d="M15 3v1.5M21.5 10H20M19.6 5.4l-1 1"/><path d="M3 20h18M4 16l6-2"/></>,
  evening: <><path d="M3 17h18"/><path d="M8 17a4 4 0 0 1 8 0"/><path d="M5 21h14"/></>,
  night: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>,
}

export function PartGlyph({ part, className }: { part: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {PARTS[part]}
    </svg>
  )
}

/** Faction marks (A.7): a barred gate, a bowl under a circle, a tent line with a small flame. */
const MARKS: Record<string, React.ReactNode> = {
  iron_compact: <><path d="M5 21V8a7 7 0 0 1 14 0v13"/><path d="M9 21v-9M15 21v-9"/><path d="M3 14h18"/></>,
  ashen_covenant: <><circle cx="12" cy="6" r="3"/><path d="M4 13h16a8 8 0 0 1-16 0z"/><path d="M9 21h6"/></>,
  rootless: <><path d="M2 20l5-8 5 8M10 20l5-8 5 8"/><path d="M2 20h20"/><path d="M12 9c-1.2-1.3-1-3 0-5 1 2 1.2 3.7 0 5z"/></>,
}

export function FactionMark({ faction, className, title }: { faction: string; className?: string; title?: string }) {
  if (!MARKS[faction]) return null
  return (
    <svg viewBox="0 0 24 24" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}
      focusable="false" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {MARKS[faction]}
    </svg>
  )
}
