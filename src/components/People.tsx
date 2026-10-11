import React from 'react'
import { getAllNpcs, getLocation, locationName } from '../loader'
import { closenessTier } from '../rules'
import type { GameState } from '../types'
import { FactionMark } from './icons'
import Panel from './Panel'
import styles from './People.module.css'

interface Props {
  state: GameState
  onClose: () => void
}

const FACTION_LABEL: Record<string, string> = {
  iron_compact:   'Iron Compact',
  ashen_covenant: 'Ashen Covenant',
  rootless:       'The Rootless',
}

/** The five steps of the track; Wary sits below the first. */
const TIERS = ['Stranger', 'Acquainted', 'Familiar', 'Close', 'Trusted']

const MISSING = 'the_missing_person'

function monogram(name: string): string {
  const words = name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase()
}

export default function People({ state, onClose }: Props) {
  const npcs = getAllNpcs()
  const cipher = state.player.class === 'cipher'

  const people = Object.entries(state.relationships)
    .filter(([id]) => npcs[id])
    .map(([id, rel]) => {
      const npc = npcs[id]
      const name = id === MISSING ? (state.player.missing_person.name || 'Unknown') : npc.name
      const role = id === MISSING && state.player.missing_person.relationship
        ? `Your ${state.player.missing_person.relationship.toLowerCase()}`
        : npc.role
      const where = rel.seen ? (getLocation(rel.seen.location)?.name ?? locationName(rel.seen.location)) : ''
      return { id, name, role, faction: npc.faction_alignment ?? '', closeness: rel.closeness, seen: rel.seen, where, read: cipher ? npc.read : undefined }
    })
    // U11: [missing person] first once met, then whoever changed most recently.
    .sort((a, b) => (a.id === MISSING ? -1 : b.id === MISSING ? 1 : 0)
      || (b.seen?.at ?? -1) - (a.seen?.at ?? -1)
      || b.closeness - a.closeness)

  return (
    <Panel title="People" onClose={onClose}>
      <div className={styles.body}>
        {people.length === 0 ? (
          <div className={styles.empty}>No one met yet.</div>
        ) : (
          <ul className={styles.list}>
            {people.map(p => {
              const tier = closenessTier(p.closeness)
              const step = TIERS.indexOf(tier)
              return (
                <li key={p.id} className={styles.person} data-person={p.id}>
                  {/* Portrait slot (file 06). A monogram until portraits exist. */}
                  <div className={styles.portrait} aria-hidden="true">{monogram(p.name)}</div>
                  <div className={styles.info}>
                    <div className={styles.personTop}>
                      <span className={styles.personName}>{p.name}</span>
                      {FACTION_LABEL[p.faction] && (
                        <span className={styles.personFaction}>
                          <FactionMark faction={p.faction} className={styles.mark} />
                          {FACTION_LABEL[p.faction]}
                        </span>
                      )}
                    </div>
                    <div className={styles.personRole}>{p.role}</div>
                    <div className={styles.closenessRow}>
                      <div className={styles.track} aria-hidden="true">
                        {TIERS.map((t, i) => <span key={t} className={`${styles.seg} ${i <= step ? styles.segOn : ''}`} />)}
                      </div>
                      <span className={`${styles.closenessLabel} ${tier === 'Wary' ? styles.wary : ''}`}>{tier}</span>
                    </div>
                    {p.seen && <div className={styles.seen}>Last seen: {p.where}, Day {p.seen.day}</div>}
                    {p.read && <p className={styles.read}>{p.read}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Panel>
  )
}
