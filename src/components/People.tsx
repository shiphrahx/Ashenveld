import React from 'react'
import { getActMeta } from '../loader'
import type { GameState } from '../types'
import styles from './People.module.css'

interface Props {
  state: GameState
  onClose: () => void
}

interface NpcInfo {
  id: string
  name: string
  role: string
  faction: string
  closeness: number
}

const FACTION_LABEL: Record<string, string> = {
  iron_compact:    'Iron Compact',
  ashen_covenant:  'Ashen Covenant',
  rootless:        'The Rootless',
  none:            '',
}

function closenessLabel(c: number): string {
  if (c >= 80) return 'Trusted'
  if (c >= 50) return 'Close'
  if (c >= 20) return 'Familiar'
  if (c >= 5)  return 'Acquainted'
  if (c > 0)   return 'Distant'
  return 'Unknown'
}

function closenessBarPct(c: number): number {
  return Math.max(0, Math.min(100, (c / 100) * 100))
}

function getAllNpcs(): Record<string, { name: string; role: string; faction_alignment: string }> {
  const result: Record<string, { name: string; role: string; faction_alignment: string }> = {}
  for (let act = 1; act <= 3; act++) {
    try {
      const meta = getActMeta(act) as unknown as Record<string, unknown>
      // act1 uses "npcs", act2/3 use "new_npcs"
      const block = (meta['npcs'] ?? meta['new_npcs']) as Record<string, { name: string; role: string; faction_alignment: string }> | undefined
      if (block) Object.assign(result, block)
    } catch { /* act meta not loaded yet */ }
  }
  return result
}

export default function People({ state, onClose }: Props) {
  const allNpcs = getAllNpcs()

  // Build list: only show NPCs the player has a relationship entry for,
  // OR whose initial_closeness > 0 (they were pre-seeded)
  const people: NpcInfo[] = Object.entries(allNpcs)
    .filter(([id]) => {
      const rel = state.relationships[id]
      return rel !== undefined
    })
    .map(([id, npc]) => ({
      id,
      name: npc.name === '[Player-defined name]'
        ? state.player.missing_person.name || 'Unknown'
        : npc.name,
      role: npc.role,
      faction: FACTION_LABEL[npc.faction_alignment] ?? '',
      closeness: state.relationships[id]?.closeness ?? 0,
    }))
    .sort((a, b) => b.closeness - a.closeness)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>People</span>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {people.length === 0 ? (
            <div className={styles.empty}>No one met yet.</div>
          ) : (
            people.map(p => (
              <div key={p.id} className={styles.person}>
                <div className={styles.personTop}>
                  <span className={styles.personName}>{p.name}</span>
                  {p.faction && <span className={styles.personFaction}>{p.faction}</span>}
                </div>
                <div className={styles.personRole}>{p.role}</div>
                <div className={styles.closenessRow}>
                  <div className={styles.closenessBar}>
                    <div
                      className={styles.closenessFill}
                      style={{ width: `${closenessBarPct(p.closeness)}%` }}
                    />
                  </div>
                  <span className={styles.closenessLabel}>{closenessLabel(p.closeness)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
