import React from 'react'
import type { GameState } from '../types'
import { CLASS_LABELS } from '../text'
import { Icon } from './icons'
import { dimmingBand, maxResolve, type RestOption } from '../rules'
import type { PanelId } from './TabBar'
import styles from './Sidebar.module.css'

interface Props {
  state: GameState
  onOpen: (id: PanelId) => void
  hideClock?: boolean
  /** 'column' is the wide-screen sidebar. 'sheet' is the status sheet on narrow screens. */
  variant?: 'column' | 'sheet'
  journalDot?: boolean
  /** Keys of bars that just changed, for a short highlight. */
  flash?: string[]
  rest?: RestOption
  onRest?: () => void
  /** The Dimming's last change, shown to the Arcane. */
  dimmingDelta?: number
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
const statPips = (val: number) => Math.round((val / 20) * MAX_PIPS)

// hi = stat ≥ 14 (blue-steel), lo = stat ≤ 8 (red-mid)
function pipClass(val: number, i: number, filled: number): string {
  if (i >= filled) return styles.pip
  if (val >= 14)   return `${styles.pip} ${styles.on} ${styles.hi}`
  if (val <= 8)    return `${styles.pip} ${styles.on} ${styles.lo}`
  return `${styles.pip} ${styles.on}`
}

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s

const ACTIONS: Array<[PanelId, string, string]> = [
  ['journal', 'Journal', 'Journal'],
  ['items', 'Items', 'Inventory'],
  ['map', 'Map', 'Map'],
  ['people', 'People', 'Relationships'],
]

export default function Sidebar({ state, onOpen, hideClock = false, variant = 'column', journalDot = false, flash = [], rest = { mode: null }, onRest = () => {}, dimmingDelta = 0 }: Props) {
  const { player, world, factions } = state
  const classLabel = CLASS_LABELS[player.class] ?? player.class
  const lit = (k: string) => flash.includes(k) ? styles.flash : ''
  const restLabel = rest.mode === 'eat' ? 'Eat and sit a while' : rest.cost ? `Rest until morning, ${rest.cost} coin` : 'Rest until morning'
  const curse = world.curse_spread
  const maxR = maxResolve(player.resources.max_health, curse)
  const hpPct = Math.max(0, Math.min(100, (player.resources.health / maxR) * 100))

  return (
    <aside className={`${styles.sidebar} ${variant === 'sheet' ? styles.sheet : ''}`} aria-label="Your status">

      {/* ── Condition ── */}
      <div className={styles.sb}>
        <div className={styles.sbl}>Condition</div>
        <div className={styles.hpRow}>
          <span className={styles.hpName}>Resolve</span>
          <span className={styles.hpVal}>{player.resources.health} / {maxR}</span>
        </div>
        <div className={`${styles.trackWrap} ${lit('health')}`} role="meter" aria-label="Resolve" aria-valuemin={0} aria-valuemax={maxR} aria-valuenow={player.resources.health}>
          <div className={`${styles.trackFill} ${styles.hp}`} style={{ width: `${hpPct}%` }} />
        </div>
        <div className={styles.hpRow}>
          <span className={styles.hpName}>The Dimming</span>
          <span className={styles.dimVal} data-dimming>
            {dimmingBand(curse)}
            {player.class === 'arcane' && <> · {curse}{dimmingDelta ? ` (${dimmingDelta > 0 ? '+' : '−'}${Math.abs(dimmingDelta)})` : ''}</>}
          </span>
        </div>
        <div className={`${styles.trackWrap} ${lit('dimming')}`} role="meter" aria-label="The Dimming" aria-valuemin={0} aria-valuemax={100} aria-valuenow={curse} aria-valuetext={dimmingBand(curse)}>
          <div className={`${styles.trackFill} ${styles.dim}`} style={{ width: `${curse}%` }} />
        </div>
        {!hideClock && <>
          <div className={styles.timeVal}>{cap(world.time_of_day)}</div>
          <div className={styles.timeSub}>Day {world.day}</div>
        </>}
      </div>

      {/* ── Stats (class label as section header) ── */}
      <div className={styles.sb}>
        <div className={styles.sbl}>{classLabel}</div>
        {STAT_KEYS.map(([key, label, desc]) => {
          const val = player.stats[key]
          const filled = statPips(val)
          return (
            <div key={key} className={styles.statRow}>
              <span className={styles.sn} tabIndex={0}>
                {label}
                <span className={styles.statTip} role="tooltip">{desc}</span>
              </span>
              <div className={styles.pips}>
                {Array.from({ length: MAX_PIPS }, (_, i) => (
                  <div key={i} className={pipClass(val, i, filled)} />
                ))}
                <span className={styles.statVal}>{val}</span>
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
            <div className={`${styles.repWrap} ${lit(key)}`}>
              <div className={styles.repFill} style={{ width: `${repPercent(factions[key].reputation)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Purse ── */}
      <div className={`${styles.sb} ${lit('gold')}`}>
        <div className={styles.sbl}>Purse</div>
        <span className={styles.goldVal}>{player.resources.gold}</span>{' '}
        <span className={styles.goldSub}>coin</span>
      </div>

      <div className={styles.sbSpacer} />

      <div className={styles.acts}>
        {variant === 'column' && ACTIONS.map(([id, label, tip]) => (
          <button key={id} className={styles.ab} onClick={() => onOpen(id)} aria-label={tip}>
            <Icon name={id} />
            <span className={styles.al}>{label}</span>
            {id === 'journal' && journalDot && <span className={styles.dot} />}
            <span className={styles.tip} aria-hidden="true">{tip}</span>
          </button>
        ))}
        <button
          className={`${styles.ab} ${rest.mode ? '' : styles.abOff}`}
          data-rest
          aria-disabled={rest.mode ? undefined : 'true'}
          aria-label={rest.mode ? restLabel : `Rest. ${rest.reason ?? 'You cannot rest here.'}`}
          onClick={e => { if (rest.mode) onRest(); else e.preventDefault() }}
        >
          <Icon name="rest" />
          <span className={styles.al}>{rest.mode === 'eat' ? 'Eat' : 'Rest'}</span>
          <span className={`${styles.tip} ${styles.tipWide}`} aria-hidden="true">{rest.mode ? restLabel : rest.reason ?? 'You cannot rest here.'}</span>
        </button>
        {variant === 'column' && (
          <button className={styles.ab} onClick={() => onOpen('menu')} aria-label="Menu">
            <Icon name="menu" />
            <span className={styles.al}>Menu</span>
            <span className={styles.tip} aria-hidden="true">Menu</span>
          </button>
        )}
      </div>
    </aside>
  )
}
