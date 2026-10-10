import React from 'react'
import { Icon } from './icons'
import styles from './TabBar.module.css'

export type PanelId = 'journal' | 'items' | 'map' | 'people' | 'menu' | 'status' | 'settings' | 'keys' | 'rest'

interface Props {
  onOpen: (id: PanelId) => void
  journalDot?: boolean
}

const TABS: Array<[PanelId, string]> = [
  ['journal', 'Journal'],
  ['items', 'Items'],
  ['map', 'Map'],
  ['people', 'People'],
  ['menu', 'Menu'],
]

/** Medium and narrow screens: the panel buttons along the bottom. */
export default function TabBar({ onOpen, journalDot = false }: Props) {
  return (
    <nav className={styles.bar} aria-label="Panels">
      {TABS.map(([id, label]) => (
        <button key={id} className={styles.tab} onClick={() => onOpen(id)} data-tab={id}>
          <Icon name={id} className={styles.icon} />
          <span className={styles.label}>{label}</span>
          {id === 'journal' && journalDot && <span className={styles.dot} aria-label="New in your journal" />}
        </button>
      ))}
    </nav>
  )
}
