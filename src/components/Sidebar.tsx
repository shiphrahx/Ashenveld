import React from 'react'
import type { GameState } from '../types'
import styles from './Sidebar.module.css'

interface Props {
  state: GameState
  onJournal: () => void
}

const STAT_KEYS: Array<[keyof GameState['player']['stats'], string, string]> = [
  ['strength',     'STR', 'Strength — Raw physical power. Determines your ability to force, carry, break, and endure through brute effort.'],
  ['dexterity',    'DEX', 'Dexterity — Speed, precision, and coordination. Used for stealth, ranged attacks, sleight of hand, and fine motor tasks.'],
  ['stamina',      'STA', 'Stamina — Endurance and resilience. Governs how long you can exert yourself and how quickly you recover from strain.'],
  ['intelligence', 'INT', 'Intelligence — Reasoning and recall. Used for reading situations, understanding lore, solving problems, and resisting mental influence.'],
  ['mana',         'MAN', 'Mana — Attunement to the unseen. Required to perceive, channel, or resist arcane forces. Depletes with use and recovers with rest.'],
  ['charisma',     'CHA', 'Charisma — Force of personality. Determines how people respond to you — whether they trust, fear, follow, or open up.'],
  ['perception',   'PER', 'Perception — Awareness and instinct. Used to notice what others miss: hidden things, changes in behaviour, danger before it arrives.'],
]

const FACTION_KEYS: Array<[keyof GameState['factions'], string]> = [
  ['iron_compact',   'Iron Compact'],
  ['ashen_covenant', 'Ashen Covenant'],
  ['rootless',       'The Rootless'],
]

// Reputation: centre is 50% at rep 0. Range −40 to +40 → 0–100%
function repPercent(rep: number): number {
  return Math.max(0, Math.min(100, ((rep + 40) / 80) * 100))
}

const MAX_PIPS = 10

// Map stat value (1–20) to filled pip count out of 10
function statPips(val: number): number {
  return Math.round((val / 20) * MAX_PIPS)
}

// hi = stat ≥ 14 (blue-steel), lo = stat ≤ 8 (red-mid)
function pipClass(val: number, i: number, filled: number): string {
  if (i >= filled) return styles.pip
  if (val >= 14)   return `${styles.pip} ${styles.on} ${styles.hi}`
  if (val <= 8)    return `${styles.pip} ${styles.on} ${styles.lo}`
  return `${styles.pip} ${styles.on}`
}

// Class display label
const CLASS_LABELS: Record<string, string> = {
  commander: 'The Commander',
  arcane:    'The Arcane',
  ranger:    'The Ranger',
  cipher:    'The Cipher',
}

export default function Sidebar({ state, onJournal }: Props) {
  const { player, world, factions } = state
  const hpPct = Math.max(0, Math.min(100, (player.resources.health / player.resources.max_health) * 100))
  const classLabel = CLASS_LABELS[player.class] ?? player.class

  return (
    <div className={styles.sidebar}>

      {/* ── Condition ── */}
      <div className={styles.sb}>
        <div className={styles.sbl}>Condition</div>
        <div className={styles.hpRow}>
          <span className={styles.hpName}>Health</span>
          <span className={styles.hpVal}>{player.resources.health} / {player.resources.max_health}</span>
        </div>
        <div className={styles.trackWrap}>
          <div className={`${styles.trackFill} ${styles.hp}`} style={{ width: `${hpPct}%` }} />
        </div>
        <div className={styles.timeVal}>{formatTime(world.time_of_day)}</div>
        <div className={styles.timeSub}>Day {world.day}&nbsp;·&nbsp;{formatTimeSub(world.time_of_day)}</div>
      </div>

      {/* ── Stats (class label as section header) ── */}
      <div className={styles.sb}>
        <div className={styles.sbl}>{classLabel}</div>
        {STAT_KEYS.map(([key, label, desc]) => {
          const val = player.stats[key]
          const filled = statPips(val)
          return (
            <div key={key} className={styles.statRow}>
              <span className={styles.sn}>
                {label}
                <span className={styles.statTip}>{desc}</span>
              </span>
              <div className={styles.pips}>
                {Array.from({ length: MAX_PIPS }, (_, i) => (
                  <div key={i} className={pipClass(val, i, filled)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Factions ── */}
      <div className={styles.sb}>
        <div className={styles.sbl}>Factions</div>
        {FACTION_KEYS.map(([key, label]) => (
          <div key={key} className={styles.facRow}>
            <span className={styles.fn}>{label}</span>
            <div className={styles.repWrap}>
              <div className={styles.repFill} style={{ width: `${repPercent(factions[key].reputation)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Purse ── */}
      <div className={styles.sb}>
        <div className={styles.sbl}>Purse</div>
        <span className={styles.goldVal}>{player.resources.gold}</span>{' '}
        <span className={styles.goldSub}>coin</span>
      </div>

      <div className={styles.sbSpacer} />

      {/* ── Action buttons — exact icons from prototype ── */}
      <div className={styles.acts}>
        <button className={styles.ab} onClick={onJournal}>
          <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="15" y2="7"/><line x1="8" y1="11" x2="15" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>
          <span className={styles.al}>Journal</span>
          <span className={styles.tip}>Journal</span>
        </button>
        <button className={styles.ab}>
          <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          <span className={styles.al}>Items</span>
          <span className={styles.tip}>Inventory</span>
        </button>
        <button className={styles.ab}>
          <svg viewBox="0 0 24 24"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
          <span className={styles.al}>Map</span>
          <span className={styles.tip}>Map</span>
        </button>
        <button className={styles.ab}>
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span className={styles.al}>People</span>
          <span className={styles.tip}>Relationships</span>
        </button>
        <button className={styles.ab}>
          <svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          <span className={styles.al}>Rest</span>
          <span className={styles.tip}>Rest &amp; wait</span>
        </button>
        <button className={styles.ab}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          <span className={styles.al}>Menu</span>
          <span className={styles.tip}>Save / options</span>
        </button>
      </div>
    </div>
  )
}

// ── Time formatting ───────────────────────────────────────────────────────────

function formatTime(raw: string): string {
  // If stored as "HH:MM — label", extract just label for the big display
  const dashIdx = raw.indexOf(' — ')
  if (dashIdx !== -1) return capitalise(raw.slice(dashIdx + 3))
  return capitalise(raw)
}

function formatTimeSub(raw: string): string {
  const dashIdx = raw.indexOf(' — ')
  if (dashIdx !== -1) return capitalise(raw.slice(dashIdx + 3))
  return capitalise(raw)
}

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
