import React from 'react'
import type { GameState } from '../types'
import { dimmingBand, maxResolve } from '../rules'
import styles from './StatusStrip.module.css'

interface Props {
  state: GameState
  hideClock?: boolean
  onOpen: () => void
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Medium and narrow screens: one line of status. Tapping opens the full status sheet. */
export default function StatusStrip({ state, hideClock = false, onOpen }: Props) {
  const { health, max_health, gold } = state.player.resources
  const pct = Math.max(0, Math.min(100, (health / maxResolve(max_health, state.world.curse_spread)) * 100))

  return (
    <button className={styles.strip} onClick={onOpen} aria-label="Open your status" data-status-strip>
      <span className={styles.group}>
        <span className={styles.label}>Resolve</span>
        <span className={styles.track} aria-hidden="true"><span className={styles.fill} style={{ width: `${pct}%` }} /></span>
        <span className={styles.value}>{health}</span>
      </span>
      <span className={styles.group}>
        <span className={styles.label}>Dimming</span>
        <span className={styles.value}>{dimmingBand(state.world.curse_spread)}</span>
      </span>
      {!hideClock && (
        <span className={styles.group}>
          <span className={styles.value}>Day {state.world.day}</span>
          <span className={styles.sub}>{cap(state.world.time_of_day)}</span>
        </span>
      )}
      <span className={styles.group}>
        <span className={styles.value}>{gold}</span>
        <span className={styles.sub}>coin</span>
      </span>
    </button>
  )
}
